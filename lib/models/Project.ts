import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  domain: {
    type: String,
    required: true,
  },
  ownerId: {
    type: String, // Clerk User ID
    required: true,
    index: true,
  },
  currentVersion: {
    type: String,
    default: '1.0.0',
  },
  description: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema);
