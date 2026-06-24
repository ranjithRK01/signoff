"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

/** 
 * IMPORTANT: Replace this with your local Extension ID found in chrome://extensions 
 * after loading the 'extension/dist' (or 'build') folder.
 */
const EXTENSION_ID = "YOUR_LOCAL_EXTENSION_ID"; 

export function ExtensionAuthSync() {
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken, isLoaded: authLoaded } = useAuth();

  useEffect(() => {
    if (userLoaded && authLoaded && user) {
      const sync = async () => {
        try {
          const token = await getToken();
          
          // 1. Try sending via chrome.runtime (requires EXTENSION_ID)
          if (typeof window !== 'undefined' && (window as any).chrome?.runtime?.sendMessage && EXTENSION_ID !== "YOUR_LOCAL_EXTENSION_ID") {
             (window as any).chrome.runtime.sendMessage(EXTENSION_ID, {
               type: 'SIGNOFFAI_AUTH_TOKEN',
               token: token,
               user: {
                 id: user.id,
                 name: user.fullName,
                 email: user.primaryEmailAddress?.emailAddress,
                 avatar: user.imageUrl,
               }
             }, (response: any) => {
               if ((window as any).chrome.runtime.lastError) {
                 console.log('Extension runtime sync failed (expected if ID not set):', (window as any).chrome.runtime.lastError);
               } else {
                 console.log('Auth synced with extension via runtime:', response);
               }
             });
          }

          // 2. Try sending via window.postMessage (handled by content script)
          window.postMessage({
            type: 'SIGNOFFAI_SEND_AUTH_TOKEN',
            token: token,
            user: {
              id: user.id,
              name: user.fullName,
              email: user.primaryEmailAddress?.emailAddress,
              avatar: user.imageUrl,
            }
          }, "*");
        } catch (error) {
          console.error('Failed to sync auth with extension:', error);
        }
      };
      sync();
    }
  }, [userLoaded, authLoaded, user, getToken]);

  return null;
}
