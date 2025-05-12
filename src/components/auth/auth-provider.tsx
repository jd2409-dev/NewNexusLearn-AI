
'use client';

import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import type { FirebaseError } from 'firebase/app';
import { createContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import { auth as firebaseAuthInstance } from '@/firebase';
import { useRouter } from 'next/navigation';
import { createUserProfileDocument, getUserProfile, type UserProfile } from '@/lib/user-service';

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
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(!!process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
  const router = useRouter();

  const fetchUserProfile = useCallback(async (currentUser: User | null) => {
    if (currentUser) {
      let profile = await getUserProfile(currentUser.uid);
      if (!profile) {
        // This case might happen if Firestore creation failed or for very old users
        // For new signUps, createUserProfileDocument is called explicitly.
        await createUserProfileDocument(currentUser); // Attempt to create if missing
        profile = await getUserProfile(currentUser.uid);
      }
      setUserProfile(profile);
    } else {
      setUserProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      setError("Firebase is not configured. Please ensure API keys (e.g., NEXT_PUBLIC_FIREBASE_API_KEY) are set in your .env.local file.");
      setIsFirebaseConfigured(false);
      setLoading(false);
      setUser(null);
      setUserProfile(null);
      return;
    }
    
    setIsFirebaseConfigured(true);
    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, async (currentUser) => {
      setUser(currentUser);
      await fetchUserProfile(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchUserProfile]);

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
      await fetchUserProfile(user);
      setLoading(false);
    }
  }, [user, fetchUserProfile]);

  const signIn = async (email: string, pass: string): Promise<User | null> => {
    if (!ensureFirebaseConfigured()) return null;
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(firebaseAuthInstance, email, pass);
      // onAuthStateChanged will handle setting user and fetching profile
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
      await fetchUserProfile(userCredential.user); 
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

  const value = {
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
