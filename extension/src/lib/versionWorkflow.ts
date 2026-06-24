import { db } from './firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc,
  updateDoc 
} from 'firebase/firestore';
import { ReviewItem } from './types';

/**
 * Creates a new version for a review session and carries forward unresolved issues.
 */
export async function createNewVersion(reviewId: string, currentVersionId: string, userId: string) {
  try {
    // 1. Get current version details to find version number
    const versionRef = doc(db, 'versions', currentVersionId);
    const versionSnap = await getDoc(versionRef);
    
    if (!versionSnap.exists()) throw new Error('Current version not found');
    const currentVersionData = versionSnap.data();
    const nextVersionNumber = (currentVersionData.versionNumber || 1) + 1;

    // 2. Create the new version document
    const newVersionRef = await addDoc(collection(db, 'versions'), {
      reviewId,
      versionNumber: nextVersionNumber,
      liveUrl: currentVersionData.liveUrl,
      submittedBy: userId,
      submittedAt: serverTimestamp(),
      notes: `Carried forward from V${currentVersionData.versionNumber}`,
    });

    // 3. Find unresolved issues from current version
    const issuesQuery = query(
      collection(db, 'issues'),
      where('reviewId', '==', reviewId),
      where('status', 'in', ['OPEN', 'WORKING', 'NEEDS_MORE_WORK'])
    );
    
    const unresolvedIssuesSnap = await getDocs(issuesQuery);
    
    // 4. Carry forward logic: Update issues to link to the new version
    // In this MVP, an issue can belong to multiple versions or we just track its 'latestVersion'
    const batchPromises = unresolvedIssuesSnap.docs.map(issueDoc => {
      const issueRef = doc(db, 'issues', issueDoc.id);
      return updateDoc(issueRef, {
        latestVersionId: newVersionRef.id,
        status: 'NEEDS_VALIDATION' // Mark as needs validation in the new version
      });
    });

    await Promise.all(batchPromises);

    // 5. Update review session's current version
    const reviewRef = doc(db, 'reviews', reviewId);
    await updateDoc(reviewRef, {
      currentVersionId: newVersionRef.id,
      updatedAt: serverTimestamp()
    });

    return newVersionRef.id;
  } catch (error) {
    console.error('Error creating new version:', error);
    throw error;
  }
}
