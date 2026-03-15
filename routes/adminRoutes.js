const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {authorizeRoles} = require('../middleware/roleMiddleware')
const { handleGetAllUsers, handleGetUserById, handleUpdateUserProfile, handleUpdateUserStatus, handleVerifyUserKYC, handleRegisterAdmin } = require('../controllers/authController');


// Admin routes
router.post('/register-admin', protect, authorizeRoles(['super_admin']), handleRegisterAdmin);

router.get('/users', protect, authorizeRoles(['admin', 'super_admin']), handleGetAllUsers);
router.get('/users/:userId', protect, authorizeRoles(['admin', 'super_admin']), handleGetUserById);
router.put('/users/:userId', protect, authorizeRoles(['admin', 'super_admin']), handleUpdateUserProfile);
router.put('/users/:userId/status', protect, authorizeRoles(['admin', 'super_admin']), handleUpdateUserStatus);
router.patch('/users/:userId/verify', protect, authorizeRoles(['admin', 'super_admin']), handleVerifyUserKYC);

module.exports = router;