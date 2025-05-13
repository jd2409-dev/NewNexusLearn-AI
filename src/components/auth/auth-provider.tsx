
'use client';

import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import type { FirebaseError } from 'firebase/app';
import { createContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import { auth as firebaseAuthInstance, db } from '@/firebase'; 
import { useRouter } from 'next/navigation';
import { createUserProfileDocument, getUserProfile, type UserProfile, updateUserLoginStreak, ensureFreePlan } from '@/lib/user-service';
import { doc, onSnapshot } from 'firebase/firestore';


export interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<User | null>;
  signUp: (email: string, pass: string) => Promise<User | null>;
  signOut: () => Promise<void>;
  error: string | null;
  clearError: () => void;
  isFirebaseConfigured: boolean;
  refreshUserProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  // Check initial configuration status based on presence of essential keys
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(() => {
    const configured = !!firebaseApiKey && !!firebaseProjectId;
    if (!configured) {
        console.error(
            "Firebase is not configured for the client. " +
            "Please ensure NEXT_PUBLIC_FIREBASE_API_KEY and other Firebase " +
            "environment variables are set correctly in your .env.local file."
        );
    }
    return configured;
  });

  const router = useRouter();

   const fetchUserProfileData = useCallback(async (currentUser: User | null, isNewUser: boolean = false) => {
    if (currentUser) {
      let profile = await getUserProfile(currentUser.uid);
      if (!profile || isNewUser) { // if new user, or profile somehow missing, (re)create it
        await createUserProfileDocument(currentUser); // This sets 'free' plan
        profile = await getUserProfile(currentUser.uid);
      } else if (profile.plan === null || profile.plan === undefined) {
        // If existing user has no plan set, ensure 'free' plan is set
        await ensureFreePlan(currentUser.uid);
        profile = await getUserProfile(currentUser.uid); // Re-fetch after plan update
      }
      setUserProfile(profile);
    } else {
      setUserProfile(null);
    }
  }, []);


  useEffect(() => {
    // This effect runs once on mount to set the initial configuration error if needed.
    if (!isFirebaseConfigured && !error) { // Only set error if not already set
        const errorMsg = "Firebase is not configured. Please ensure API keys (e.g., NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID) are set in your .env.local file.";
        setError(errorMsg);
        setLoading(false);
        // No need to return early, let onAuthStateChanged handle user state if somehow configured later.
    }

    const authUnsubscribe = onAuthStateChanged(firebaseAuthInstance, async (currentUser) => {
      if (!isFirebaseConfigured && currentUser) {
          // This case should be rare: auth state changes but config is bad.
          // Log out the user to prevent inconsistent state.
          await firebaseSignOut(firebaseAuthInstance);
          setUser(null);
          setUserProfile(null);
          setLoading(false);
          if (!error) setError("Firebase configuration error detected post-login. Please check setup.");
          return;
      }
      
      setUser(currentUser);
      if (currentUser) {
        await updateUserLoginStreak(currentUser.uid); 
        
        const profileRef = doc(db, "userProfiles", currentUser.uid);
        const profileUnsubscribe = onSnapshot(profileRef, async (docSnap) => {
          if (docSnap.exists()) {
            let profileData = docSnap.data() as UserProfile;
            // Ensure plan is 'free' if it's null/undefined upon snapshot retrieval
            if (profileData.plan === null || profileData.plan === undefined) {
                await ensureFreePlan(currentUser.uid); // This updates DB
                // The snapshot listener should pick up this change automatically.
                // For immediate UI update, you might re-fetch or optimistically update:
                profileData.plan = "free"; 
            }
            setUserProfile(profileData);
          } else {
            // Profile doesn't exist, means it's a new user or data was deleted.
            // createUserProfileDocument will be called during signup or initial fetch if needed.
            // For onAuthStateChanged, if user exists but no profile, attempt to create.
            await createUserProfileDocument(currentUser); // sets 'free' plan
            const newProfile = await getUserProfile(currentUser.uid); // fetch it
            setUserProfile(newProfile);
          }
          setLoading(false);
        }, (snapshotError) => {
          console.error("Error listening to user profile:", snapshotError);
          setError("Could not load user profile in real-time.");
          setLoading(false);
        });
        return () => profileUnsubscribe();
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => authUnsubscribe();
  }, [isFirebaseConfigured, error]); // Added error to dependency array


  const clearError = () => setError(null);

  const ensureFirebaseConfiguredClient = (): boolean => {
    if (!isFirebaseConfigured) {
      setError("Firebase is not configured. Cannot perform authentication operations.");
      // Update state if it wasn't caught initially
      setIsFirebaseConfigured(false); 
      return false;
    }
    return true;
  };

  const refreshUserProfile = useCallback(async () => {
    if (user && isFirebaseConfigured) {
      setLoading(true);
      await fetchUserProfileData(user); // isNewUser defaults to false
      setLoading(false);
    }
  }, [user, fetchUserProfileData, isFirebaseConfigured]);

  const signIn = async (email: string, pass: string): Promise<User | null> => {
    if (!ensureFirebaseConfiguredClient()) return null;
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(firebaseAuthInstance, email, pass);
      // User state will be set by onAuthStateChanged.
      // Profile (with plan) will be handled by onAuthStateChanged's snapshot listener or fetchUserProfileData.
      return userCredential.user;
    } catch (e) {
      const firebaseError = e as FirebaseError;
      console.error("Sign in error:", firebaseError);
      setError(firebaseError.message || 'Failed to sign in.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, pass: string): Promise<User | null> => {
    if (!ensureFirebaseConfiguredClient()) return null;
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance, email, pass);
      // createUserProfileDocument is called by fetchUserProfileData(userCredential.user, true)
      // which is triggered by onAuthStateChanged or direct call.
      // For immediate availability after signup, explicitly call fetch or ensure profile is created.
      await fetchUserProfileData(userCredential.user, true); // true for isNewUser
      return userCredential.user;
    } catch (e) {
      const firebaseError = e as FirebaseError;
      console.error("Sign up error:", firebaseError);
      setError(firebaseError.message || 'Failed to sign up.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!ensureFirebaseConfiguredClient()) return;
    setLoading(true);
    setError(null);
    try {
      await firebaseSignOut(firebaseAuthInstance);
      setUser(null);
      setUserProfile(null);
      router.push('/login'); 
    } catch (e) {
      const firebaseError = e as FirebaseError;
      console.error("Sign out error:", firebaseError);
      setError(firebaseError.message || 'Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    error,
    clearError,
    isFirebaseConfigured,
    refreshUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
