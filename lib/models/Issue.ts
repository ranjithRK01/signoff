import mongoose from 'mongoose';

const IssueSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true,
  },
  userId: {
    type: String, // Clerk User ID
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
  },
  status: {
    type: String,
    enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'VALIDATED'],
    default: 'OPEN',
  },
  assignee: String,
  screenshot: String, // URL to storage
  annotatedScreenshot: String, // URL to storage
  cropImageUrl: String, // Cropped section
  elementSelector: String,
  elementBoundingBox: {
    top: Number,
    left: Number,
    width: Number,
    height: Number,
  },
  elementRect: {
    x: Number,
    y: Number,
    width: Number,
    height: Number,
  },
  pageUrl: String,
  pageTitle: String,
  pathname: String,
  versionId: String,
  // Browser/Environment info
  browser: {
    name: String,
    version: String,
    userAgent: String,
  },
  os: String,
  viewport: {
    width: Number,
    height: Number,
  },
  scrollPosition: {
    x: Number,
    y: Number,
  },
  devicePixelRatio: Number,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // DOM/Element context
  elementTag: String,
  elementId: String,
  elementClasses: [String],
  elementText: String,
  // Annotation
  annotationKind: {
    type: String,
    enum: ['PIN', 'RECT', 'TEXT', 'CIRCLE', 'ARROW'],
    default: 'PIN',
  },
  annotationData: mongoose.Schema.Types.Mixed,
});

// Add compound index for projectId + createdAt to optimize sorting
IssueSchema.index({ projectId: 1, createdAt: -1 });

export default mongoose.models.Issue || mongoose.model('Issue', IssueSchema);
