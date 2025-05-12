'use client';

import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import type { FirebaseError } from 'firebase/app';
import { createContext, useEffect, useState, type ReactNode } from 'react';
import { auth as firebaseAuthInstance } from '@/firebase'; // Renamed to avoid conflict
import { useRouter } from 'next/navigation';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<User | null>;
  signUp: (email: string, pass: string) => Promise<User | null>;
  signOut: () => Promise<void>;
  error: string | null;
  clearError: () => void;
  isFirebaseConfigured: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(!!firebaseAuthInstance);
  const router = useRouter();

  useEffect(() => {
    if (firebaseAuthInstance) {
      setIsFirebaseConfigured(true);
      const unsubscribe = onAuthStateChanged(firebaseAuthInstance, (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setIsFirebaseConfigured(false);
      setLoading(false);
      setUser(null);
      setError("Firebase is not configured. Please ensure API keys (e.g., NEXT_PUBLIC_FIREBASE_API_KEY) are set in your .env file.");
    }
  }, []); // firebaseAuthInstance is determined at module load and won't change

  const clearError = () => setError(null);

  const ensureFirebaseConfigured = (): boolean => {
    if (!firebaseAuthInstance) {
      setError("Firebase is not configured. Cannot perform authentication operations.");
      setIsFirebaseConfigured(false); // Explicitly set if somehow it was true
      return false;
    }
    if (!isFirebaseConfigured) setIsFirebaseConfigured(true); // Ensure it's true if instance exists
    return true;
  };

  const signIn = async (email: string, pass: string): Promise<User | null> => {
    if (!ensureFirebaseConfigured()) return null;
    setLoading(true);
    setError(null);
    try {
      // firebaseAuthInstance is guaranteed to be defined here by ensureFirebaseConfigured
      const userCredential = await signInWithEmailAndPassword(firebaseAuthInstance!, email, pass);
      setUser(userCredential.user);
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
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance!, email, pass);
      setUser(userCredential.user);
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
      await firebaseSignOut(firebaseAuthInstance!);
      setUser(null);
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
    loading,
    signIn,
    signUp,
    signOut,
    error,
    clearError,
    isFirebaseConfigured,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
