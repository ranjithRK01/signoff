import mongoose from 'mongoose';

const ReviewAttachmentSchema = new mongoose.Schema({
  reviewItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReviewItem',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['screenshot', 'annotated', 'pin'],
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  thumbnailUrl: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.ReviewAttachment || mongoose.model('ReviewAttachment', ReviewAttachmentSchema);
