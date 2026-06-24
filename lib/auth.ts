import { getAuth, clerkClient } from '@clerk/nextjs/server';

export async function getUserIdFromRequest(req: Request): Promise<string | null> {
  // First try getAuth (for cookie-based auth from web app)
  const { userId } = getAuth(req as any);
  if (userId) return userId;

  // If no cookie, try to extract and verify Bearer token from extension
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  
  try {
    const verified = await clerkClient.verifyToken(token);
    return verified.sub;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}
