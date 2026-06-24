import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  reviewType: {
    type: String,
    default: 'website',
  },
  status: {
    type: String,
    enum: ['IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED'],
    default: 'IN_REVIEW',
  },
  currentVersionId: String,
  createdBy: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Review || mongoose.model('Review', ReviewSchema);
