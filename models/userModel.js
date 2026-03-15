const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },

    phone: {
        type: String,
        trim: true,
    },

    avatar: {
        type: String,
    },

    role: {
        type: String,
        enum: ['customer', 'artisan', 'business_owner', 'admin', 'super_admin'],
        default: 'customer',
    },

    skills: {
        type: [String],
    },

    idNumber: {
        type: String,
        unique: true,
        sparse: true,
    },
    favourites: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Service',
        }
    ],

    rating: {
        type: Number,
        min: 0,
        max: 5,
    },

    reviewText: {
        type: String,
        trim: true,
    },

    bio: {
        type: String,
        trim: true,
    },

    totalReviews: {
        type: Number,
        default: 0,
    },

    otp: {
        type: String,
        default: null,
    },
    otpExpires: {
        type: Date,
        default: null,
    },

    isVerified: {
        type: Boolean,
        default: false,
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },

    kycVerified: {
        type: Boolean,
        default: false,
    },

    kycSubmittedAt: {
        type: Date,
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
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    requiresVerification: {
        type: Boolean,
        default: false,
    },
},
    { timestamps: true }
);


const User = mongoose.model("User", userSchema);
module.exports = User;