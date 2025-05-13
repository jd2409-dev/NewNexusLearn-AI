
'use client';

import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import type { FirebaseError } from 'firebase/app';
import { createContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import { auth as firebaseAuthInstance, db } from '@/firebase'; 
import { useRouter } from 'next/navigation';
import { createUserProfileDocument, getUserProfile, type UserProfile, updateUserLoginStreak, ensureFreePlan, markOnboardingTourAsCompleted } from '@/lib/user-service';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';


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
  completeOnboardingTour: () => Promise<void>; // Added for tour completion
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
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(() => {
    const configured = !!firebaseApiKey && !!firebaseProjectId;
    if (!configured && typeof window !== 'undefined') { // Log error only on client
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
      if (!profile || isNewUser) {
        await createUserProfileDocument(currentUser); 
        profile = await getUserProfile(currentUser.uid);
      } else {
        let profileUpdates: any = {};
        let needsProfileUpdate = false;

        if (profile.plan === null || profile.plan === undefined) {
          await ensureFreePlan(currentUser.uid); // This updates DB
          profileUpdates.plan = "free"; // Optimistic update for local state
          profileUpdates.planSelectedAt = serverTimestamp(); // Or a client-side timestamp
          needsProfileUpdate = true;
        }
        if (!profile.studyData) { // If studyData is missing entirely
            const initialWeeklyHours: any[] = [ // Use any for simplicity, or import WeeklyHours
                { day: "Mon", hours: 0 }, { day: "Tue", hours: 0 }, { day: "Wed", hours: 0 },
                { day: "Thu", hours: 0 }, { day: "Fri", hours: 0 }, { day: "Sat", hours: 0 }, { day: "Sun", hours: 0 },
            ];
            profileUpdates.studyData = {
                overallProgress: 0, subjects: [], weeklyStudyHours: initialWeeklyHours,
                lastActivityDate: serverTimestamp(), pastQuizzes: [], xp: 0, level: 1, coins: 0,
                achievements: [], currentStreak: 1, lastLoginDate: serverTimestamp(),
                hasCompletedOnboardingTour: false, // Ensure tour flag is set
            };
            needsProfileUpdate = true;
        } else if (profile.studyData.hasCompletedOnboardingTour === undefined) { // If only tour flag is missing
             // Ensure tour flag is set for existing users if it's missing
            profileUpdates['studyData.hasCompletedOnboardingTour'] = false;
            needsProfileUpdate = true;
        }
        
        if (needsProfileUpdate) {
            // If we made local optimistic updates, reflect them before setting state
            // Or re-fetch after ensuring plan/studyData to get latest from DB
            if (profileUpdates.plan) profile.plan = profileUpdates.plan;
            if (profileUpdates.studyData) profile.studyData = { ...profile.studyData, ...profileUpdates.studyData};
            if (profileUpdates['studyData.hasCompletedOnboardingTour'] !== undefined && profile.studyData) {
                 profile.studyData.hasCompletedOnboardingTour = profileUpdates['studyData.hasCompletedOnboardingTour'];
            }
             // To ensure DB consistency if this was a critical fix path:
            // await updateDoc(doc(db, "userProfiles", currentUser.uid), profileUpdates);
            // profile = await getUserProfile(currentUser.uid); // Re-fetch
        }
      }
      setUserProfile(profile);
    } else {
      setUserProfile(null);
    }
  }, []);


  useEffect(() => {
    if (!isFirebaseConfigured && !error && typeof window !== 'undefined') {
        const errorMsg = "Firebase is not configured. Please ensure API keys (e.g., NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID) are set in your .env.local file.";
        setError(errorMsg);
        setLoading(false);
    }

    if (!firebaseAuthInstance) { // If Firebase auth is not initialized (due to config error)
        setLoading(false);
        return;
    }

    const authUnsubscribe = onAuthStateChanged(firebaseAuthInstance, async (currentUser) => {
      if (!isFirebaseConfigured && currentUser) {
          await firebaseSignOut(firebaseAuthInstance);
          setUser(null); setUserProfile(null); setLoading(false);
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
            let needsDBUpdate = false;
            let updatesForDB: any = {};

            if (profileData.plan === null || profileData.plan === undefined) {
                updatesForDB.plan = "free";
                updatesForDB.planSelectedAt = serverTimestamp();
                profileData.plan = "free"; // Optimistic update
                needsDBUpdate = true;
            }
            if (!profileData.studyData) {
                 const initialWeeklyHours: any[] = [
                    { day: "Mon", hours: 0 }, { day: "Tue", hours: 0 }, { day: "Wed", hours: 0 },
                    { day: "Thu", hours: 0 }, { day: "Fri", hours: 0 }, { day: "Sat", hours: 0 }, { day: "Sun", hours: 0 },
                ];
                 updatesForDB.studyData = {
                    overallProgress: 0, subjects: [], weeklyStudyHours: initialWeeklyHours,
                    lastActivityDate: serverTimestamp(), pastQuizzes: [], xp: 0, level: 1, coins: 0,
                    achievements: [], currentStreak: 1, lastLoginDate: serverTimestamp(),
                    hasCompletedOnboardingTour: false,
                };
                profileData.studyData = updatesForDB.studyData; // Optimistic
                needsDBUpdate = true;
            } else if (profileData.studyData.hasCompletedOnboardingTour === undefined) {
                updatesForDB['studyData.hasCompletedOnboardingTour'] = false;
                profileData.studyData.hasCompletedOnboardingTour = false; // Optimistic
                needsDBUpdate = true;
            }

            if (needsDBUpdate) {
                await updateDoc(profileRef, updatesForDB);
            }
            setUserProfile(profileData); // Set potentially optimistically updated profile
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
  }, [isFirebaseConfigured, error]); 


  const clearError = () => setError(null);

  const ensureFirebaseConfiguredClient = (): boolean => {
    if (!isFirebaseConfigured) {
      setError("Firebase is not configured. Cannot perform authentication operations.");
      setIsFirebaseConfigured(false); 
      return false;
    }
    if (!firebaseAuthInstance) { // Double check instance
        setError("Firebase Auth is not initialized. Configuration issue persists.");
        return false;
    }
    return true;
  };

  const refreshUserProfile = useCallback(async () => {
    if (user && isFirebaseConfigured && firebaseAuthInstance) {
      setLoading(true);
      await fetchUserProfileData(user); 
      setLoading(false);
    }
  }, [user, fetchUserProfileData, isFirebaseConfigured]);

  const signIn = async (email: string, pass: string): Promise<User | null> => {
    if (!ensureFirebaseConfiguredClient()) return null;
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(firebaseAuthInstance, email, pass);
      // onAuthStateChanged and the Firestore listener will handle setting user and profile
      return userCredential.user;
    } catch (e) {
      const firebaseError = e as FirebaseError;
      console.error("Sign in error:", firebaseError);
      let friendlyMessage = 'Failed to sign in.';
      if (firebaseError.code === 'auth/invalid-credential' || firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password') {
        friendlyMessage = 'Invalid email or password. Please try again.';
      } else if (firebaseError.code === 'auth/too-many-requests') {
        friendlyMessage = 'Access to this account has been temporarily disabled due to many failed login attempts. You can try again later.';
      }
      setError(friendlyMessage);
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
      await createUserProfileDocument(userCredential.user);
      // onAuthStateChanged will handle setting user and fetching profile,
      // but we fetch profile here to ensure it's available for immediate redirect logic.
      await fetchUserProfileData(userCredential.user, true); 
      return userCredential.user;
    } catch (e) {
      const firebaseError = e as FirebaseError;
      console.error("Sign up error:", firebaseError);
      let friendlyMessage = 'Failed to sign up.';
      if (firebaseError.code === 'auth/email-already-in-use') {
        friendlyMessage = 'This email address is already in use.';
      } else if (firebaseError.code === 'auth/weak-password') {
        friendlyMessage = 'The password is too weak. Please use a stronger password.';
      }
      setError(friendlyMessage);
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

  const completeOnboardingTour = async () => {
    if (user && isFirebaseConfigured && firebaseAuthInstance) {
      try {
        await markOnboardingTourAsCompleted(user.uid);
        await refreshUserProfile(); // Refresh to get the updated tour status
      } catch (error) {
        console.error("Error completing onboarding tour:", error);
        // Optionally set an error state or toast
      }
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
    completeOnboardingTour,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
