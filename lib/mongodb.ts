import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || '';

if (!MONGO_URI) {
  throw new Error('Please define the MONGO_URI environment variable inside .env.local');
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4 // Force IPv4 to avoid some DNS issues
    };

    cached.promise = mongoose.connect(MONGO_URI, opts).then(async (mongoose) => {
      // Ensure all indexes are created
      await Promise.all([
        import('@/lib/models/Issue'),
        import('@/lib/models/Project'),
        import('@/lib/models/User'),
        import('@/lib/models/Review'),
        import('@/lib/models/ReviewItem'),
        import('@/lib/models/ReviewComment'),
        import('@/lib/models/ReviewAttachment'),
        import('@/lib/models/Version'),
        import('@/lib/models/Approval'),
        import('@/lib/models/WaitlistSignup'),
        import('@/lib/models/WaitlistStats'),
      ]);
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
