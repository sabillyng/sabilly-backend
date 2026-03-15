
const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    details: { type: String },
    reason: { type: String },
}, {
    timestamps: true
});

const History = mongoose.model("History", historySchema);
module.exports = History;