
'use client';

import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import type { FirebaseError } from 'firebase/app';
import { createContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import { auth as firebaseAuthInstance, db, firebaseConfig } from '@/firebase'; // Renamed to avoid conflict, Added firebaseConfig import
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
  completeOnboardingTour: () => Promise<void>;
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

  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(() => {
    // Use the imported firebaseConfig for this check
    const configured = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;
    if (!configured && typeof window !== 'undefined') {
        console.error(
            "Firebase is not configured for the client. " +
            "Please ensure Firebase configuration is correctly set in src/firebase.ts."
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
          await ensureFreePlan(currentUser.uid);
          profileUpdates.plan = "free";
          profileUpdates.planSelectedAt = serverTimestamp();
          needsProfileUpdate = true;
        }
        if (!profile.studyData) {
            const initialWeeklyHours: any[] = [
                { day: "Mon", hours: 0 }, { day: "Tue", hours: 0 }, { day: "Wed", hours: 0 },
                { day: "Thu", hours: 0 }, { day: "Fri", hours: 0 }, { day: "Sat", hours: 0 }, { day: "Sun", hours: 0 },
            ];
            profileUpdates.studyData = {
                overallProgress: 0, subjects: [], weeklyStudyHours: initialWeeklyHours,
                lastActivityDate: serverTimestamp(), pastQuizzes: [], xp: 0, level: 1, coins: 0,
                achievements: [], currentStreak: 1, lastLoginDate: serverTimestamp(),
                hasCompletedOnboardingTour: false,
            };
            needsProfileUpdate = true;
        } else if (profile.studyData.hasCompletedOnboardingTour === undefined) {
            profileUpdates['studyData.hasCompletedOnboardingTour'] = false;
            needsProfileUpdate = true;
        }

        if (needsProfileUpdate) {
            if (profileUpdates.plan) profile.plan = profileUpdates.plan;
            if (profileUpdates.studyData) profile.studyData = { ...profile.studyData, ...profileUpdates.studyData};
            if (profileUpdates['studyData.hasCompletedOnboardingTour'] !== undefined && profile.studyData) {
                 profile.studyData.hasCompletedOnboardingTour = profileUpdates['studyData.hasCompletedOnboardingTour'];
            }
        }
      }
      setUserProfile(profile);
    } else {
      setUserProfile(null);
    }
  }, []);


  useEffect(() => {
    if (!isFirebaseConfigured && !error && typeof window !== 'undefined') {
        const errorMsg = "Firebase is not configured. Please ensure API keys are correctly set in src/firebase.ts.";
        setError(errorMsg);
        setLoading(false);
        return; // Stop further execution if Firebase is not configured
    }

    if (!firebaseAuthInstance) {
        if (isFirebaseConfigured) { // Only error if it was supposed to be configured
            setError("Firebase Auth instance is not available. Check Firebase initialization in src/firebase.ts.");
        }
        setLoading(false);
        return;
    }

    let profileUnsubscribeGlobal: (() => void) | undefined = undefined;

    const authUnsubscribe = onAuthStateChanged(firebaseAuthInstance, async (currentUser) => {
      if (profileUnsubscribeGlobal) { // Clean up previous profile listener if any
        profileUnsubscribeGlobal();
        profileUnsubscribeGlobal = undefined;
      }

      setUser(currentUser);
      if (currentUser) {
        try {
          await updateUserLoginStreak(currentUser.uid);

          const profileRef = doc(db, "userProfiles", currentUser.uid);
          profileUnsubscribeGlobal = onSnapshot(profileRef, async (docSnap) => {
            if (docSnap.exists()) {
              let profileData = docSnap.data() as UserProfile;
              let needsDBUpdate = false;
              let updatesForDB: any = {};

              if (profileData.plan === null || profileData.plan === undefined) {
                  updatesForDB.plan = "free";
                  updatesForDB.planSelectedAt = serverTimestamp();
                  profileData.plan = "free";
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
                  profileData.studyData = updatesForDB.studyData;
                  needsDBUpdate = true;
              } else if (profileData.studyData.hasCompletedOnboardingTour === undefined) {
                  updatesForDB['studyData.hasCompletedOnboardingTour'] = false;
                  if(profileData.studyData) profileData.studyData.hasCompletedOnboardingTour = false;
                  needsDBUpdate = true;
              }

              if (needsDBUpdate) {
                  try {
                    await updateDoc(profileRef, updatesForDB);
                  } catch (updateError) {
                    console.error("Error applying default updates to profile:", updateError);
                    // Decide if this error should block loading or set an authError
                  }
              }
              setUserProfile(profileData);
            } else {
              await createUserProfileDocument(currentUser); // This creates the profile with defaults
              const newProfile = await getUserProfile(currentUser.uid); // Fetch the newly created profile
              setUserProfile(newProfile);
            }
            setLoading(false); // Profile processing done
          }, (snapshotError) => {
            console.error("Error listening to user profile:", snapshotError);
            setError("Could not load user profile in real-time. Please try refreshing.");
            setUserProfile(null);
            setLoading(false);
          });
        } catch (e) { // Catch errors from updateUserLoginStreak or initial setup for onSnapshot
          console.error("Error during user session initialization (streak/profile listener setup):", e);
          setError("Failed to initialize your session. Please try logging in again.");
          setUserProfile(null);
          setLoading(false);
        }
      } else { // No currentUser
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribeGlobal) {
        profileUnsubscribeGlobal();
      }
    };
  }, [isFirebaseConfigured, fetchUserProfileData]); // error removed from deps to prevent loop if error is set


  const clearError = () => setError(null);

  const ensureFirebaseConfiguredClient = (): boolean => {
    if (!isFirebaseConfigured) {
      setError("Firebase is not configured. Cannot perform authentication operations.");
      return false;
    }
    if (!firebaseAuthInstance) {
        setError("Firebase Auth is not initialized. Configuration issue persists.");
        return false;
    }
    return true;
  };

  const refreshUserProfile = useCallback(async () => {
    if (user && isFirebaseConfigured && firebaseAuthInstance) {
      setLoading(true);
      try {
        await fetchUserProfileData(user);
      } catch (e) {
        console.error("Error refreshing user profile:", e);
        setError("Could not refresh user profile.");
      } finally {
        setLoading(false);
      }
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
      } else if (firebaseError.code === 'auth/invalid-api-key' || firebaseError.code === 'auth/configuration-not-found') {
        friendlyMessage = 'Firebase configuration error. Please contact support.';
      }
      setError(friendlyMessage);
      setLoading(false); // Ensure loading is false on error
      return null;
    }
    // setLoading(false) will be handled by onAuthStateChanged listener typically
  };

  const signUp = async (email: string, pass: string): Promise<User | null> => {
    if (!ensureFirebaseConfiguredClient()) return null;
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance, email, pass);
      // createUserProfileDocument is now called within onAuthStateChanged if profile doesn't exist,
      // or if it's a new user through fetchUserProfileData's logic.
      // The onAuthStateChanged listener will pick up the new user.
      // Forcing a profile fetch here might be redundant but ensures quicker availability for redirects.
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
      } else if (firebaseError.code === 'auth/invalid-api-key' || firebaseError.code === 'auth/configuration-not-found') {
         friendlyMessage = 'Firebase configuration error. Please contact support.';
      }
      setError(friendlyMessage);
      setLoading(false); // Ensure loading is false on error
      return null;
    }
    // setLoading(false) will be handled by onAuthStateChanged listener
  };

  const signOut = async () => {
    if (!ensureFirebaseConfiguredClient()) return;
    setLoading(true);
    setError(null);
    try {
      await firebaseSignOut(firebaseAuthInstance);
      setUser(null); // Explicitly set user to null
      setUserProfile(null); // Explicitly set profile to null
      // Router push is handled by layouts/pages based on user state
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
        await refreshUserProfile();
      } catch (error) {
        console.error("Error completing onboarding tour:", error);
        setError("Could not save tour completion status.");
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
