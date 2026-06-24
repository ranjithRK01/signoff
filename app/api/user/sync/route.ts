import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function POST(req: Request) {
  try {
    const { clerkUserId, email, name, image } = await req.json();

    if (!clerkUserId || !email) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();

    let user = await User.findOne({ clerkUserId });

    if (!user) {
      user = await User.create({
        clerkUserId,
        email,
        name,
        image,
      });
      console.log('New user created in MongoDB:', clerkUserId);
    } else {
      // Optional: Update user info if it changed
      user.name = name;
      user.image = image;
      user.email = email;
      await user.save();
    }

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error('Error syncing user:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
