
const Service = require('../models/serviceModel');
const User = require('../models/userModel');
const History = require('../models/historyModel');
const cloudinary = require('../utils/cloudinary');
const Job = require('../models/jobModel');


const handleCreateService = async (req, res) => {
    try {
        // For multipart/form-data, fields are in req.body
        const { title, description, priceRange, category, location } = req.body;
        const providerId = req.user._id;

        // Validate required fields
        if (!title || !category) {
            return res.status(400).json({
                success: false,
                message: "Title and category are required fields"
            });
        }

        // Process images - multer puts files in req.files (array format with uploadImages)
        const uploadedImages = [];
        
        if (req.files && req.files.length > 0) {
            for (let file of req.files) {
                // Validate image file size (already handled by multer, but double-check)
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

                    uploadedImages.push({
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
        if (uploadedImages.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: "At least one image is required for service listing" 
            });
        }

        // Parse priceRange if it's a string
        let parsedPriceRange = priceRange;
        if (typeof priceRange === 'string') {
            try {
                parsedPriceRange = JSON.parse(priceRange);
            } catch (e) {
                // If it's not valid JSON, keep it as a simple object
                parsedPriceRange = { string: priceRange };
            }
        }

        const newService = new Service({
            title,
            description,
            priceRange: parsedPriceRange,
            category,
            location,
            images: uploadedImages.map(img => img.url),
            provider: providerId,
            isActive: true
        });

        await newService.save();

        // Log to history
        await History.create({
            action: "createService",
            userId: providerId,
            targetUser: providerId,
            details: `Service "${title}" created with ID ${newService._id}`
        });

        // Populate provider info before sending response
        await newService.populate('provider', 'fullName email phone avatar role');

        res.status(201).json({
            success: true,
            message: "Service created successfully",
            data: newService
        });
    } catch (error) {
        console.error('Create service error:', error);
        res.status(500).json({
            success: false,
            message: error.message || "An error occurred while creating the service"
        });
    }
};

// Get all services with pagination and filtering
const handleGetServices = async (req, res) => {
    try {
        const { page = 1, limit = 10, category, location, provider, search, minPrice, maxPrice } = req.query;
        const filter = { isActive: true }; 

        if (category) filter.category = category;
        if (location) filter.location = { $regex: location, $options: 'i' };
        if (provider) filter.provider = provider;
        
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } }
            ];
        }

        // Price range filtering (if implemented)
        if (minPrice || maxPrice) {
            // This assumes you have a numeric price field
            // You may need to adjust based on your priceRange structure
            filter.price = {};
            if (minPrice) filter.price.$gte = parseInt(minPrice);
            if (maxPrice) filter.price.$lte = parseInt(maxPrice);
        }

        const services = await Service.find(filter)
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .populate('provider', 'fullName email phone avatar role kycVerified rating totalReviews skills location')
            .sort({ createdAt: -1 });

        const total = await Service.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: services,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
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

// Get single service by id
const handleGetServiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const service = await Service.findById(id)
            .populate('provider', 'fullName email phone avatar role kycVerified rating totalReviews skills bio location createdAt');

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

// Update service
const handleUpdateService = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, priceRange, category, location } = req.body;
        
        const service = await Service.findById(id);
        
        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found"
            });
        }

        // Check if user is the provider
        if (service.provider.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this service"
            });
        }

        // Update fields
        if (title) service.title = title;
        if (description) service.description = description;
        if (priceRange) {
            if (typeof priceRange === 'string') {
                try {
                    service.priceRange = JSON.parse(priceRange);
                } catch (e) {
                    service.priceRange = { string: priceRange };
                }
            } else {
                service.priceRange = priceRange;
            }
        }
        if (category) service.category = category;
        if (location) service.location = location;
        
        service.updatedAt = Date.now();

        // Handle new images if uploaded
        if (req.files && req.files.length > 0) {
            const uploadedImages = [];
            
            for (let file of req.files) {
                if (file.size > 10 * 1024 * 1024) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `Image ${file.originalname} is too large. Maximum 10MB per image.` 
                    });
                }

                try {
                    const uploadRes = await new Promise((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { folder: 'services/images' },
                            (error, result) => {
                                if (error) reject(error);
                                else resolve(result);
                            }
                        );
                        uploadStream.end(file.buffer);
                    });

                    uploadedImages.push(uploadRes.secure_url);
                } catch (uploadError) {
                    console.error('Image upload error:', uploadError);
                }
            }

            if (uploadedImages.length > 0) {
                service.images = [...service.images, ...uploadedImages];
            }
        }

        await service.save();

        res.status(200).json({
            success: true,
            message: "Service updated successfully",
            data: service
        });
    } catch (error) {
        console.error('Update service error:', error);
        res.status(500).json({
            success: false,
            message: "An error occurred while updating the service"
        });
    }
};

// Delete service (soft delete)
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

        // Check if user is the provider or admin
        if (service.provider.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to delete this service"
            });
        }

        // Soft delete - set isActive to false
        service.isActive = false;
        await service.save();

        // Log to history
        await History.create({
            action: "deleteService",
            userId: req.user._id,
            targetUser: service.provider,
            details: `Service "${service.title}" deleted`
        });

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

// Toggle service active status
const handleToggleServiceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        
        const service = await Service.findById(id);
        
        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found"
            });
        }

        // Check if user is the provider or admin
        if (service.provider.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this service"
            });
        }

        service.isActive = isActive;
        service.updatedAt = Date.now();
        await service.save();

        res.status(200).json({
            success: true,
            message: `Service ${isActive ? 'activated' : 'deactivated'} successfully`,
            data: service
        });
    } catch (error) {
        console.error('Toggle service status error:', error);
        res.status(500).json({
            success: false,
            message: "An error occurred while updating service status"
        });
    }
};

// Get services by provider
const handleGetProviderServices = async (req, res) => {
    try {
        const { providerId } = req.params;
        const { page = 1, limit = 10, includeInactive = false } = req.query;

        const filter = { provider: providerId };
        if (!includeInactive) {
            filter.isActive = true;
        }

        const services = await Service.find(filter)
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Service.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: services,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get provider services error:', error);
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching provider services"
        });
    }
};

// Search services
const handleSearchServices = async (req, res) => {
    try {
        const { q, category, location, page = 1, limit = 20 } = req.query;
        
        if (!q) {
            return res.status(400).json({
                success: false,
                message: "Search query is required"
            });
        }

        const filter = {
            isActive: true,
            $or: [
                { title: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } },
                { category: { $regex: q, $options: 'i' } }
            ]
        };

        if (category) filter.category = category;
        if (location) filter.location = { $regex: location, $options: 'i' };

        const services = await Service.find(filter)
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .populate('provider', 'fullName avatar rating kycVerified')
            .sort({ createdAt: -1 });

        const total = await Service.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: services,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Search services error:', error);
        res.status(500).json({
            success: false,
            message: "An error occurred while searching services"
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


// get all providers for public view
const handleGetProviders = async (req, res) => {
    try {
        const providers = await User.find({ role: { $in: ['artisan', 'business_owner'] } }).select('-password').populate('services', 'title category location');
        res.status(200).json({
            success: true,
            data: providers
        });
    } catch (error) {
        console.error('Get providers error:', error);
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching providers"
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
    handleGetFavourites,
    handleGetProviders,
    handleSearchServices,
    handleGetProviderServices,
    handleToggleServiceStatus,
    handleUpdateService
};
