"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";

export function SyncUser() {
  const { user, isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const sync = async () => {
        try {
          await fetch('/api/user/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              clerkUserId: user.id,
              email: user.primaryEmailAddress?.emailAddress,
              name: user.fullName,
              image: user.imageUrl,
            }),
          });
        } catch (error) {
          console.error('Failed to sync user:', error);
        }
      };
      sync();
    }
  }, [isLoaded, isSignedIn, user]);

  return null;
}
