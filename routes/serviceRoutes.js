
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { handleAddToFavourites, handleGetFavourites, handleGetServices, handleCreateService, handleGetServiceById, handleApplyForService, handleCompleteService, handleDeleteService, handleRateProvider, handleGetProviderProfile } = require('../controllers/serviceController');



router.get('/services', protect, handleGetServices);
router.post('/service', protect, handleCreateService);
router.get('/service/:id', protect, handleGetServiceById);
router.post('/service/:id/apply', protect, handleApplyForService);
router.post('/service/:id/complete', protect, handleCompleteService);
router.delete('/service/:id/delete', protect, handleDeleteService);

// rate provider routes
router.post('/service/:id/rate', protect, handleRateProvider);

// get provide profile and reviews
router.get('/provider/:id', protect, handleGetProviderProfile);


module.exports = router;