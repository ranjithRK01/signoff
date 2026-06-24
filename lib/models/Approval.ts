import mongoose from 'mongoose';

const ApprovalSchema = new mongoose.Schema({
  reviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review',
    required: true,
    index: true,
  },
  approvedVersion: {
    type: Number,
    required: true,
  },
  approvedBy: {
    type: String,
    required: true,
  },
  approvedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Approval || mongoose.model('Approval', ApprovalSchema);
