import mongoose from 'mongoose';

const VersionSchema = new mongoose.Schema({
  reviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review',
    required: true,
    index: true,
  },
  versionNumber: {
    type: Number,
    required: true,
  },
  liveUrl: {
    type: String,
    required: true,
  },
  submittedBy: {
    type: String,
    required: true,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  notes: String,
  mockVariant: {
    type: Number,
    default: 1,
  },
});

export default mongoose.models.Version || mongoose.model('Version', VersionSchema);
