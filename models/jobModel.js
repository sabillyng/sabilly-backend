
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    budget: {
        type: Number,
    },
    category: {
        type: String,
        required: true,
    },
    location: {
        type: String,
        trim: true,
    },
    images: [{ type: String }],
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
        type: String,
        enum: ['open', 'assigned', 'in_progress', 'completed', 'cancelled'],
        default: 'open',
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
},

{timestamps: true}

);

const Job = mongoose.model('Job', jobSchema);
module.exports = Job;