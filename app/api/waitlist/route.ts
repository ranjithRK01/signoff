import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WaitlistSignup from '@/lib/models/WaitlistSignup';
import WaitlistStats from '@/lib/models/WaitlistStats';

export async function GET() {
  try {
    await connectDB();
    
    // Get or create waitlist stats
    let stats = await WaitlistStats.findOne();
    if (!stats) {
      stats = await WaitlistStats.create({ claimedCount: 7 });
    }
    
    return NextResponse.json({ success: true, claimedCount: stats.claimedCount }, { status: 200 });
  } catch (error) {
    console.error('Waitlist GET error:', error);
    return NextResponse.json({ success: false, claimedCount: 7 }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const { email } = await request.json();
    
    // Check if email already exists
    const existingSignup = await WaitlistSignup.findOne({ email });
    if (existingSignup) {
      // Get current stats without incrementing
      const stats = await WaitlistStats.findOne();
      return NextResponse.json({ 
        success: true, 
        claimedCount: stats?.claimedCount || 7,
        message: 'You are already on the list!' 
      }, { status: 200 });
    }
    
    // Create new signup
    await WaitlistSignup.create({ email });
    
    // Increment claimed count
    let stats = await WaitlistStats.findOne();
    if (!stats) {
      stats = await WaitlistStats.create({ claimedCount: 7 });
    }
    stats.claimedCount += 1;
    await stats.save();
    
    console.log('Waitlist signup:', email);
    return NextResponse.json({ success: true, claimedCount: stats.claimedCount }, { status: 200 });
  } catch (error) {
    console.error('Waitlist POST error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
