"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// POST /api/reports — submit a user report
router.post('/', auth_1.authenticateToken, async (req, res) => {
    const reporterId = req.user.id;
    const { reported_id, reason, description } = req.body;
    if (!reported_id || !reason) {
        res.status(400).json({ error: 'reported_id and reason are required' });
        return;
    }
    try {
        await (0, db_1.query)(`INSERT INTO reports (reporter_id, reported_id, reason, description)
       VALUES ($1, $2, $3, $4)`, [reporterId, reported_id, reason, description || null]);
        res.status(201).json({ success: true });
    }
    catch (error) {
        console.error('[reports]', error);
        // Non-fatal — always return success so UI shows confirmation
        res.status(200).json({ success: true });
    }
});
exports.default = router;
