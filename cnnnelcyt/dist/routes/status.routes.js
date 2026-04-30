"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const status_controller_1 = require("../controllers/status.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/', auth_1.authenticateToken, status_controller_1.createStatus);
router.get('/feed', auth_1.authenticateToken, status_controller_1.getStatusFeed);
// Specific sub-routes before the /:id wildcard
router.get('/:id/viewers', auth_1.authenticateToken, status_controller_1.getStatusViewers);
router.post('/:id/view', auth_1.authenticateToken, status_controller_1.viewStatus);
router.delete('/:id', auth_1.authenticateToken, status_controller_1.deleteStatus);
exports.default = router;
