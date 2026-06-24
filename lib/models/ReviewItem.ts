import mongoose from 'mongoose';

const ReviewItemSchema = new mongoose.Schema({
  reviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review',
    required: true,
    index: true,
  },
  pageId: String,
  itemNumber: {
    type: Number,
    required: true,
  },
  createdInVersion: {
    type: Number,
    required: true,
  },
  latestVersion: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  issueType: {
    type: String,
    enum: ['VISUAL', 'FUNCTIONAL', 'CONTENT', 'GENERAL'],
    required: true,
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true,
  },
  status: {
    type: String,
    enum: ['REQUESTED', 'WORKING', 'READY_FOR_REVIEW', 'APPROVED', 'NEEDS_MORE_WORK'],
    default: 'REQUESTED',
  },
  createdBy: {
    type: String,
    required: true,
  },
  assignedTo: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  annotation: {
    pageUrl: String,
    pageTitle: String,
    startX: Number,
    startY: Number,
    width: Number,
    height: Number,
    documentX: Number,
    documentY: Number,
    viewport: { width: Number, height: Number },
    scrollPosition: { x: Number, y: Number },
    deviceMode: String,
    browser: String,
    browserVersion: String,
    os: String,
    timestamp: String,
    xPercent: Number,
    yPercent: Number,
    widthPercent: Number,
    heightPercent: Number,
    annotationKind: String,
    domContext: {
      tagName: String,
      elementText: String,
      elementId: String,
      elementClasses: [String],
    },
  },
  functional: {
    expectedResult: String,
    actualResult: String,
    stepsToReproduce: String,
  },
  screenshotUrl: String,
  annotatedScreenshotUrl: String,
  cropImageUrl: String,
  thumbnailUrl: String,
});

export default mongoose.models.ReviewItem || mongoose.model('ReviewItem', ReviewItemSchema);
