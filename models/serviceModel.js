const mongoose = require('mongoose');


const serviceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: { type: String, trim: true },
    priceRange: { string: String },
    category: {
        type: String,
        required: true,
    },
    location: {
        type: String,
        trim: true,
    },
    images: [{ type: String }],
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: {
        type: Number,
        min: 0,
        max: 5,
    },
    totalReviews: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
});


const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;