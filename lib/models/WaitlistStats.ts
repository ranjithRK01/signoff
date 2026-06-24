import mongoose from 'mongoose';

const WaitlistStatsSchema = new mongoose.Schema({
  claimedCount: {
    type: Number,
    default: 7,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.WaitlistStats || mongoose.model('WaitlistStats', WaitlistStatsSchema);
