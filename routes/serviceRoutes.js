
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { handleAddToFavourites, handleGetFavourites, handleGetServices, handleCreateService, handleGetServiceById, handleApplyForService, handleCompleteService, handleDeleteService, handleRateProvider, handleGetProviderProfile, handleGetProviders, handleSearchServices, handleGetProviderServices, handleUpdateService, handleToggleServiceStatus, handleGetTopRatedProviders } = require('../controllers/serviceController');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { uploadImages } = require('../utils/multer');



router.get('/all-services', handleGetServices);
router.post('/create-service', protect, authorizeRoles('artisan', 'business_owner'), (req, res, next) => {
        // Use the uploadImages middleware from your multer config
        uploadImages(req, res, (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            next();
        });
    },
    handleCreateService
);

// Update service
router.put('/update-service/:id', protect, (req, res, next) => {
        uploadImages(req, res, (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            next();
        });
    },
    handleUpdateService
);
// Toggle service status (activate/deactivate)
router.patch('/:id/toggle', protect, handleToggleServiceStatus);
router.get('/top-rated-providers', handleGetTopRatedProviders)


router.get('/get-service/:id', protect, handleGetServiceById);
router.post('/apply/:id', protect, handleApplyForService);
router.post('/complete/:id', protect, handleCompleteService);
router.delete('/delete/:id', protect, handleDeleteService);


router.get('/search', handleSearchServices);
router.get('/search-skill', handleGetTopRatedProviders);
router.get('/provider/:providerId', handleGetProviderServices);

// rate provider routes
router.post('/service/:id/rate', protect, handleRateProvider);

// get provider profile and reviews
router.get('/provider/:id', handleGetProviderProfile);
router.get('/providers', handleGetProviders);


router.post('/favourites/:id', protect, handleAddToFavourites);
router.get('/favourites', protect, handleGetFavourites);


module.exports = router;