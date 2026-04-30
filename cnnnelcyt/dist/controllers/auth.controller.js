"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.googleCallback = exports.googleAuthUrl = exports.googleLogin = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const uuid_1 = require("uuid");
const google_auth_library_1 = require("google-auth-library");
const googleClient = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, 'postmessage' // Required for the frontend auth-code flow
);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';
const register = async (req, res) => {
    const { email, password, name } = req.body;
    try {
        const userExists = await (0, db_1.query)('SELECT id FROM profiles WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            res.status(400).json({ error: 'User already exists' });
            return;
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const userId = (0, uuid_1.v4)();
        // In standard node we might not have the auth schema unless we recreate it. 
        // Assuming a flattened structure or directly inserting into profiles and handling auth locally.
        // For exact parity with schema, we insert into public.profiles directly if auth.users is removed,
        // or insert into auth.users. Here we will directly insert to profiles and store password in a new table if needed.
        // Let's assume we create a custom "auth_users" table or just modify profiles to hold passwords.
        // However, to keep it compatible with existing schema without modifying it, we assume auth.users exists.
        await (0, db_1.query)(`INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data) VALUES ($1, $2, $3, $4)`, [userId, email, hashedPassword, { full_name: name }]);
        // Explicitly create profile since the Supabase trigger is no longer present
        await (0, db_1.query)(`INSERT INTO public.profiles (id, name, email, avatar_url) VALUES ($1, $2, $3, $4)`, [userId, name, email, '']);
        const token = jsonwebtoken_1.default.sign({ id: userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.status(201).json({ token, user: { id: userId, email, name } });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.register = register;
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await (0, db_1.query)('SELECT id, encrypted_password, raw_user_meta_data FROM auth.users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const user = result.rows[0];
        const isMatch = await bcrypt_1.default.compare(password, user.encrypted_password);
        if (!isMatch) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.status(200).json({ token, user: { id: user.id, email, name: user.raw_user_meta_data.full_name } });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.login = login;
const googleLogin = async (req, res) => {
    const { code, credential } = req.body;
    if (!code && !credential) {
        res.status(400).json({ error: 'Missing authorization code or credential' });
        return;
    }
    try {
        let idToken = credential;
        if (code) {
            const { tokens } = await googleClient.getToken(code);
            if (!tokens.id_token) {
                res.status(400).json({ error: 'No ID token received from Google via code exchange' });
                return;
            }
            idToken = tokens.id_token;
        }
        const ticket = await googleClient.verifyIdToken({
            idToken: idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            res.status(400).json({ error: 'Invalid Google token payload' });
            return;
        }
        const { email, name, picture, sub: googleId } = payload;
        console.log('Google user verified:', { email, name });
        // Check if user exists
        let result = await (0, db_1.query)('SELECT id FROM auth.users WHERE email = $1', [email]);
        let userId;
        if (result.rows.length === 0) {
            userId = (0, uuid_1.v4)();
            console.log('Creating new user:', userId);
            // Insert into auth.users
            await (0, db_1.query)(`INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data) VALUES ($1, $2, $3, $4)`, [userId, email, 'google-oauth', { full_name: name, avatar_url: picture, provider: 'google', provider_id: googleId }]);
            // Insert into public.profiles
            await (0, db_1.query)(`INSERT INTO public.profiles (id, name, email, avatar_url) VALUES ($1, $2, $3, $4)`, [userId, name, email, picture || '']);
            console.log('User and profile created');
        }
        else {
            userId = result.rows[0].id;
            console.log('User exists:', userId);
            // Ensure profile exists just in case
            const profileResult = await (0, db_1.query)('SELECT id FROM public.profiles WHERE id = $1', [userId]);
            if (profileResult.rows.length === 0) {
                console.log('Profile missing, creating for existing user');
                await (0, db_1.query)(`INSERT INTO public.profiles (id, name, email, avatar_url) VALUES ($1, $2, $3, $4)`, [userId, name, email, picture || '']);
            }
            else if (picture) {
                // Optionally update profile picture if it changed
                await (0, db_1.query)('UPDATE public.profiles SET avatar_url = $1 WHERE id = $2 AND avatar_url = $3', [picture, userId, '']);
            }
        }
        const token = jsonwebtoken_1.default.sign({ id: userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        console.log('Token generated successfully');
        res.status(200).json({ token, user: { id: userId, email, name } });
    }
    catch (error) {
        console.log('Google login error detail:', error.message);
        if (error.response) {
            console.error('Google API error response:', error.response.data);
        }
        res.status(500).json({ error: 'Google login failed', detail: error.message });
    }
};
exports.googleLogin = googleLogin;
const googleAuthUrl = (req, res) => {
    const url = googleClient.generateAuthUrl({
        access_type: 'offline',
        scope: ['email', 'profile', 'openid'],
        prompt: 'select_account',
    });
    res.json({ url });
};
exports.googleAuthUrl = googleAuthUrl;
const googleCallback = async (req, res) => {
    const code = req.query.code;
    if (!code) {
        res.status(400).json({ error: 'Missing authorization code' });
        return;
    }
    // Reuse the main googleLogin handler with code in body
    req.body = { code };
    return (0, exports.googleLogin)(req, res);
};
exports.googleCallback = googleCallback;
const getMe = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('[Auth] getMe called for userId:', userId);
        const result = await (0, db_1.query)('SELECT * FROM profiles WHERE id = $1', [userId]);
        console.log('[Auth] getMe result rows:', result.rows.length);
        if (result.rows.length === 0) {
            // Profile not found, but user is authenticated. Let's see if auth.users has them.
            const userResult = await (0, db_1.query)('SELECT email, raw_user_meta_data FROM auth.users WHERE id = $1', [userId]);
            if (userResult.rows.length > 0) {
                const authUser = userResult.rows[0];
                const name = authUser.raw_user_meta_data?.full_name || 'User';
                const email = authUser.email;
                // Auto-create profile
                await (0, db_1.query)(`INSERT INTO public.profiles (id, name, email, avatar_url) VALUES ($1, $2, $3, $4)`, [userId, name, email, '']);
                const newProfile = await (0, db_1.query)('SELECT * FROM profiles WHERE id = $1', [userId]);
                res.status(200).json({ user: newProfile.rows[0] });
                return;
            }
            res.status(404).json({ error: 'Profile not found' });
            return;
        }
        res.status(200).json({ user: result.rows[0] });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getMe = getMe;
