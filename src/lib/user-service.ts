import type { User } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, type Timestamp } from "firebase/firestore";
import { db } from "@/firebase";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  plan: "free" | "paid" | null;
  createdAt: Timestamp;
  planSelectedAt?: Timestamp;
}

export async function createUserProfileDocument(user: User): Promise<void> {
  const userProfileRef = doc(db, "userProfiles", user.uid);
  const userProfileSnap = await getDoc(userProfileRef);

  if (!userProfileSnap.exists()) {
    try {
      await setDoc(userProfileRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        plan: null,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error creating user profile document:", error);
      // Optionally re-throw or handle as needed
    }
  }
}

export async function setUserPlan(uid: string, plan: "free" | "paid"): Promise<void> {
  const userProfileRef = doc(db, "userProfiles", uid);
  try {
    await setDoc(userProfileRef, { plan, planSelectedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    console.error("Error setting user plan:", error);
    throw error; // Re-throw to be caught by caller
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userProfileRef = doc(db, "userProfiles", uid);
  try {
    const docSnap = await getDoc(userProfileRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}
