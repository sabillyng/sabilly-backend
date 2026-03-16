
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { handleAddToFavourites, handleGetFavourites, handleGetServices, handleCreateService, handleGetServiceById, handleApplyForService, handleCompleteService, handleDeleteService, handleRateProvider, handleGetProviderProfile, handleGetProviders } = require('../controllers/serviceController');



router.get('/all-services', handleGetServices);
router.post('/create-service', protect, handleCreateService);
router.get('/get-service/:id', protect, handleGetServiceById);
router.post('/apply/:id', protect, handleApplyForService);
router.post('/complete/:id', protect, handleCompleteService);
router.delete('/delete/:id', protect, handleDeleteService);

// rate provider routes
router.post('/service/:id/rate', protect, handleRateProvider);

// get provider profile and reviews
router.get('/provider/:id', handleGetProviderProfile);
router.get('/providers', handleGetProviders);


router.post('/favourites/:id', protect, handleAddToFavourites);
router.get('/favourites', protect, handleGetFavourites);


module.exports = router;