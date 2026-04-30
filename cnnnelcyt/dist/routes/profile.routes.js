"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profile_controller_1 = require("../controllers/profile.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Static routes BEFORE wildcard /:id
router.get('/search', auth_1.authenticateToken, profile_controller_1.searchProfiles);
router.post('/status', auth_1.authenticateToken, profile_controller_1.updateStatus);
router.put('/update', auth_1.authenticateToken, profile_controller_1.updateProfile); // legacy alias
// Per-profile routes (static sub-routes before /:id)
router.get('/:id/xp', auth_1.authenticateToken, profile_controller_1.getUserXP); // useUserRank
router.get('/:id', auth_1.authenticateToken, profile_controller_1.getProfile);
router.put('/:id', auth_1.authenticateToken, profile_controller_1.updateProfile);
exports.default = router;
