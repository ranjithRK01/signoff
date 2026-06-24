import mongoose from 'mongoose';

const ReviewCommentSchema = new mongoose.Schema({
  reviewItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReviewItem',
    required: true,
    index: true,
  },
  reviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review',
    required: true,
    index: true,
  },
  text: {
    type: String,
    required: true,
  },
  authorId: {
    type: String,
    required: true,
  },
  authorName: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.ReviewComment || mongoose.model('ReviewComment', ReviewCommentSchema);
