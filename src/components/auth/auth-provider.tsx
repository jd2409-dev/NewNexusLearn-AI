
'use client';

import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import type { FirebaseError } from 'firebase/app';
import { createContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import { auth as firebaseAuthInstance, db } from '@/firebase'; // Ensure db is exported from firebase.ts
import { useRouter } from 'next/navigation';
import { createUserProfileDocument, getUserProfile, type UserProfile, updateUserLoginStreak } from '@/lib/user-service';
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
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(!!firebaseApiKey && !!firebaseProjectId);
  const router = useRouter();

  const fetchUserProfileData = useCallback(async (currentUser: User | null) => {
    if (currentUser) {
      let profile = await getUserProfile(currentUser.uid);
      if (!profile) {
        await createUserProfileDocument(currentUser);
        profile = await getUserProfile(currentUser.uid);
      }
      setUserProfile(profile);
    } else {
      setUserProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!firebaseApiKey || !firebaseProjectId) {
      const errorMsg = "Firebase is not configured. Please ensure API keys (e.g., NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID) are set in your .env.local file.";
      console.error(errorMsg);
      setError(errorMsg);
      setIsFirebaseConfigured(false);
      setLoading(false);
      setUser(null);
      setUserProfile(null);
      return;
    }
    
    setIsFirebaseConfigured(true);
    
    const authUnsubscribe = onAuthStateChanged(firebaseAuthInstance, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await updateUserLoginStreak(currentUser.uid); // Update login streak
        const profileRef = doc(db, "userProfiles", currentUser.uid);
        const profileUnsubscribe = onSnapshot(profileRef, async (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            await createUserProfileDocument(currentUser);
            const newProfile = await getUserProfile(currentUser.uid);
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
  }, [firebaseApiKey, firebaseProjectId]);


  const clearError = () => setError(null);

  const ensureFirebaseConfigured = (): boolean => {
    if (!isFirebaseConfigured) {
      setError("Firebase is not configured. Cannot perform authentication operations.");
      return false;
    }
    return true;
  };

  const refreshUserProfile = useCallback(async () => {
    if (user) {
      setLoading(true);
      await fetchUserProfileData(user);
      setLoading(false);
    }
  }, [user, fetchUserProfileData]);

  const signIn = async (email: string, pass: string): Promise<User | null> => {
    if (!ensureFirebaseConfigured()) return null;
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(firebaseAuthInstance, email, pass);
      // onAuthStateChanged and the Firestore listener will handle setting user and profile
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
    if (!ensureFirebaseConfigured()) return null;
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance, email, pass);
      await createUserProfileDocument(userCredential.user); 
      // onAuthStateChanged will handle setting user and fetching profile,
      // but we fetch profile here to ensure it's available for immediate redirect logic.
      // Also, it will call updateUserLoginStreak for the new user.
      const profile = await getUserProfile(userCredential.user.uid);
      setUserProfile(profile);
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
    if (!ensureFirebaseConfigured()) return;
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
