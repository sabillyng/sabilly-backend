
const Service = require('../models/serviceModel');
const User = require('../models/userModel');
const History = require('../models/historyModel');
const cloudinary = require('../utils/cloudinary');
const Job = require('../models/jobModel');



const handleCreateService = async (req, res) => {
    try {
        const { title, description, priceRange, category, location } = req.body;
        const providerId = req.user._id;
        

        let media = {
            images: [],
        };

        // Process images
        if (req.files && req.files.images) {
            const imagesArray = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
            
            for (let file of imagesArray) {
                // Validate image file size
                if (file.size > 10 * 1024 * 1024) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `Image ${file.originalname} is too large. Maximum 10MB per image.` 
                    });
                }

                try {
                    const uploadRes = await new Promise((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            {
                                folder: 'services/images',
                                resource_type: 'image',
                                quality: 'auto',
                                fetch_format: 'auto'
                            },
                            (error, result) => {
                                if (error) reject(error);
                                else resolve(result);
                            }
                        );
                        uploadStream.end(file.buffer);
                    });

                    media.images.push({
                        url: uploadRes.secure_url,
                        public_id: uploadRes.public_id,
                        originalName: file.originalname,
                        size: file.size,
                        mimetype: file.mimetype
                    });
                } catch (uploadError) {
                    console.error('Image upload error:', uploadError);
                    return res.status(500).json({ 
                        success: false, 
                        message: `Failed to upload image: ${file.originalname}` 
                    });
                }
            }
        }

        // Validate that at least one image is provided
        if (media.images.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: "At least one image is required for property listing" 
            });
        }


        const newService = new Service({
            title,
            description,
            priceRange,
            category,
            location,
            images: media.images.map(img => img.url),
            provider: providerId
        });

        await newService.save();

        // Log to history
        await History.create({
            action: "createService",
            userId: providerId,
            targetUser: providerId,
            details: `Service "${title}" created with ID ${newService._id}`
        });

        res.status(201).json({
            success: true,
            message: "Service created successfully",
            data: newService
        });
    } catch (error) {
        console.error('Create service error:', error);
        res.status(500).json({
            success: false,
            message: "An error occurred while creating the service"
        });
    }
};



// get all services with pagination and filtering
const handleGetServices = async (req, res) => {
    try {
        const { page = 1, limit = 10, category, location } = req.query;
        const filter = {}; 

        if (category) filter.category = category;
        if (location) filter.location = location;

        const services = await Service.find(filter)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('provider', 'fullName email');
        const total = await Service.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: services,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get services error:', error);
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching services"
        });
    }
};


// get single service by id
const handleGetServiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const service = await Service.findById(id).populate('provider', 'fullName email');
        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found"
            });
        }

        res.status(200).json({
            success: true,
            data: service
        });
    } catch (error) {
        console.error('Get service by ID error:', error);
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching the service"
        });
    }
};


// apply for a service
const handleApplyForService = async (req, res) => {
    try {
        const { id } = req.params;
        const service = await Service.findById(id);
        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found"
            });
        }

        if (service.provider.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot apply for your own service"
            });
        }

        const newJob = new Job({
            title: service.title,
            description: service.description,
            service: service._id,
            applicant: req.user._id
        });

        await newJob.save();
        res.status(201).json({
            success: true,
            message: "Applied for service successfully",
            data: newJob
        });
    } catch (error) {
        console.error('Apply for service error:', error);
        res.status(500).json({
            success: false,
            message: "An error occurred while applying for the service"
        });
    }
};


// delete service
const handleDeleteService = async (req, res) => {
    try {
        const { id } = req.params;
        const service = await Service.findById(id);
        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found"
            });
        }
        if (service.provider.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to delete this service"
            });
        }

        await service.remove();
        res.status(200).json({
            success: true,
            message: "Service deleted successfully"
        });
    } catch (error) {
        console.error('Delete service error:', error);
        res.status(500).json({
            success: false,
            message: "An error occurred while deleting the service"
        });
    }
};



// complete service
const handleCompleteService = async (req, res) => {
    try {
        const { id } = req.params;
        const service = await Service.findById(id);
        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found"
            });
        }

        if (service.provider.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to complete this service"
            });
        }

        service.status = 'completed';
        await service.save();
        res.status(200).json({
            success: true,
            message: "Service marked as completed"
        });
    } catch (error) {
        console.error('Complete service error:', error);
        res.status(500).json({
            success: false,
            message: "An error occurred while completing the service"
        });
    }
};




// rate provider through service completion
const handleRateProvider = async (req, res) => {
    try {
        const { id } = req.params; // service ID
        const { rating, reviewText } = req.body;

        const service = await Service.findById(id);
        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found"
            });
        }

        if (service.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: "You can only rate a provider after the service is completed"
            });
        }

        const provider = await User.findById(service.provider);
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: "Provider not found"
            });
        }

        // Update provider rating but ensure user can only rate once per service
        const existingRating = provider.rating.find(r => r.service.toString() === service._id.toString() && r.user.toString() === req.user._id.toString());
        if (existingRating) {
            return res.status(400).json({
                success: false,
                message: "You have already rated this provider for this service"
            });
        }

        if (reviewText) {
            provider.reviewText = reviewText;
        }

        provider.rating.push({ service: service._id, user: req.user._id, rating });
        provider.rating = provider.rating.reduce((acc, r) => acc + r.rating, 0) / provider.rating.length;
        provider.totalReviews = provider.rating.length;
        await provider.save();

        res.status(200).json({
            success: true,
            message: "Provider rated successfully"
        });
    } catch (error) {
        console.error('Rate provider error:', error);
        res.status(500).json({
            success: false,
            message: "An error occurred while rating the provider"
        });
    }
};


// get provider profile with reviews and average rating
const handleGetProviderProfile = async (req, res) => {
    try {
        const { id } = req.params; // provider ID
        const provider = await User.findById(id).select('-password').populate('services', 'title category location');
        if (!provider || provider.role !== 'artisan' && provider.role !== 'business_owner') {
            return res.status(404).json({
                success: false,
                message: "Provider not found"
            });
        }

        res.status(200).json({
            success: true,
            data: provider
        });
    } catch (error) {
        console.error('Get provider profile error:', error);
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching the provider profile"
        });
    }
};

// add provider to favourites
const handleAddToFavourites = async (req, res) => {
    try {
        const { id } = req.params; // provider ID
        const provider = await User.findById(id);
        if (!provider || provider.role !== 'artisan' && provider.role !== 'business_owner') {
            return res.status(404).json({
                success: false,
                message: "Provider not found"
            });
        }

        // Add provider to favourites
        if (!req.user.favourites.includes(provider._id)) {
            req.user.favourites.push(provider._id);
            await req.user.save();
        }

        res.status(200).json({
            success: true,
            message: "Provider added to favourites"
        });
    } catch (error) {
        console.error('Add to favourites error:', error);
        res.status(500).json({
            success: false,
            message: "An error occurred while adding the provider to favourites"
        });
    }
};


// remove provider from favourites
const handleRemoveFromFavourites = async (req, res) => {
    try {
        const { id } = req.params; // provider ID
        const provider = await User.findById(id);
        if (!provider || provider.role !== 'artisan' && provider.role !== 'business_owner') {
            return res.status(404).json({
                success: false,
                message: "Provider not found"
            });
        }

        // Remove provider from favourites
        req.user.favourites = req.user.favourites.filter(favId => favId.toString() !== provider._id.toString());
        await req.user.save();
        res.status(200).json({
            success: true,
            message: "Provider removed from favourites"
        });
    } catch (error) {
        console.error('Remove from favourites error:', error);
        res.status(500).json({
            success: false,
            message: "An error occurred while removing the provider from favourites"
        });
    }
};


// get favourites
const handleGetFavourites = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('favourites', 'title category location');
        res.status(200).json({
            success: true,
            data: user.favourites
        });
    } catch (error) {
        console.error('Get favourites error:', error);
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching favourites"
        });
    }
};

module.exports = {
    handleCreateService,
    handleGetServices,
    handleGetServiceById,
    handleApplyForService,
    handleDeleteService,
    handleCompleteService,
    handleRateProvider,
    handleGetProviderProfile,
    handleAddToFavourites,
    handleRemoveFromFavourites,
    handleGetFavourites
};
