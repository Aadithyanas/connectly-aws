"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const connection_controller_1 = require("../controllers/connection.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/follow', auth_1.authenticateToken, connection_controller_1.followUser);
router.post('/unfollow', auth_1.authenticateToken, connection_controller_1.unfollowUser);
// Specific sub-routes must come before the /:userId wildcard
router.get('/:userId/followers', auth_1.authenticateToken, connection_controller_1.getFollowers);
router.get('/:userId/following', auth_1.authenticateToken, connection_controller_1.getFollowing);
router.get('/:userId', auth_1.authenticateToken, connection_controller_1.getConnections);
exports.default = router;
