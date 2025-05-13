
import type { User } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, type Timestamp, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/firebase";

export interface SubjectProgress {
  name: string;
  progress: number; // 0-100
  lastStudied?: Timestamp;
}

export interface WeeklyHours {
  day: string; // "Mon", "Tue", etc.
  hours: number;
}

export interface StudyData {
  overallProgress: number; // 0-100, could be an average or a more complex calculation
  subjects: SubjectProgress[];
  weeklyStudyHours: WeeklyHours[]; // Data for the last 7 days
  lastActivityDate?: Timestamp;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  plan: "free" | "paid" | null;
  createdAt: Timestamp;
  planSelectedAt?: Timestamp;
  studyData?: StudyData; // Optional for existing users, initialized for new users
}

export async function createUserProfileDocument(user: User): Promise<void> {
  const userProfileRef = doc(db, "userProfiles", user.uid);
  const userProfileSnap = await getDoc(userProfileRef);

  if (!userProfileSnap.exists()) {
    const initialWeeklyHours: WeeklyHours[] = [
      { day: "Mon", hours: 0 }, { day: "Tue", hours: 0 }, { day: "Wed", hours: 0 },
      { day: "Thu", hours: 0 }, { day: "Fri", hours: 0 }, { day: "Sat", hours: 0 }, { day: "Sun", hours: 0 },
    ];
    try {
      await setDoc(userProfileRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        plan: "free", // Default plan for new users
        createdAt: serverTimestamp(),
        studyData: {
          overallProgress: 0,
          subjects: [], // Initially empty, subjects added as user interacts
          weeklyStudyHours: initialWeeklyHours,
          lastActivityDate: null,
        }
      });
    } catch (error) {
      console.error("Error creating user profile document:", error);
      // Optionally re-throw or handle as needed
    }
  } else {
    // Ensure existing users have studyData initialized if it's missing
    // And ensure plan is set if it was previously null
    const currentData = userProfileSnap.data() as UserProfile;
    const updates: Partial<UserProfile> = {};
    let needsUpdate = false;

    if (!currentData.studyData) {
        const initialWeeklyHours: WeeklyHours[] = [
            { day: "Mon", hours: 0 }, { day: "Tue", hours: 0 }, { day: "Wed", hours: 0 },
            { day: "Thu", hours: 0 }, { day: "Fri", hours: 0 }, { day: "Sat", hours: 0 }, { day: "Sun", hours: 0 },
        ];
        updates.studyData = {
            overallProgress: 0,
            subjects: currentData.studyData?.subjects || [],
            weeklyStudyHours: currentData.studyData?.weeklyStudyHours || initialWeeklyHours,
            lastActivityDate: currentData.studyData?.lastActivityDate || null,
        };
        needsUpdate = true;
    }
    if (currentData.plan === null) {
        updates.plan = "free"; // Default plan for existing users without a plan
        updates.planSelectedAt = serverTimestamp();
        needsUpdate = true;
    }

    if (needsUpdate) {
        try {
            await updateDoc(userProfileRef, updates);
        } catch (error) {
            console.error("Error updating existing user profile with defaults:", error);
        }
    }
  }
}

export async function setUserPlan(uid: string, plan: "free" | "paid"): Promise<void> {
  const userProfileRef = doc(db, "userProfiles", uid);
  try {
    await updateDoc(userProfileRef, { plan, planSelectedAt: serverTimestamp() });
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
      const profile = docSnap.data() as UserProfile;
      // Ensure studyData and plan are present, initialize if not (for older profiles)
      if (!profile.studyData || profile.plan === null) {
        const initialWeeklyHours: WeeklyHours[] = [
          { day: "Mon", hours: 0 }, { day: "Tue", hours: 0 }, { day: "Wed", hours: 0 },
          { day: "Thu", hours: 0 }, { day: "Fri", hours: 0 }, { day: "Sat", hours: 0 }, { day: "Sun", hours: 0 },
        ];
        const updates: Partial<UserProfile> = {};
        if(!profile.studyData) {
            updates.studyData = {
                overallProgress: 0,
                subjects: [],
                weeklyStudyHours: initialWeeklyHours,
                lastActivityDate: undefined,
            };
        }
        if(profile.plan === null) {
            updates.plan = "free";
            updates.planSelectedAt = serverTimestamp();
        }
        // Apply updates if any are needed
        if (Object.keys(updates).length > 0) {
            await updateDoc(userProfileRef, updates);
            // Re-fetch the updated profile
            const updatedDocSnap = await getDoc(userProfileRef);
            if (updatedDocSnap.exists()) {
                 return updatedDocSnap.data() as UserProfile;
            }
        }
      }
      return profile;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}


// Placeholder function - actual implementation would involve more logic
export async function updateUserOverallProgress(userId: string, progress: number): Promise<void> {
  const userProfileRef = doc(db, "userProfiles", userId);
  try {
    await updateDoc(userProfileRef, {
      "studyData.overallProgress": progress,
      "studyData.lastActivityDate": serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating user overall progress:", error);
  }
}

// Placeholder function
export async function updateSubjectProgress(userId: string, subjectName: string, newProgress: number): Promise<void> {
  const userProfileRef = doc(db, "userProfiles", userId);
  try {
    const userProfile = await getUserProfile(userId);
    if (userProfile && userProfile.studyData) {
      const subjectIndex = userProfile.studyData.subjects.findIndex(s => s.name === subjectName);
      let newSubjectsArray;
      if (subjectIndex > -1) {
        newSubjectsArray = userProfile.studyData.subjects.map((s, index) => 
          index === subjectIndex ? { ...s, progress: newProgress, lastStudied: serverTimestamp() } : s
        );
      } else {
        newSubjectsArray = [
          ...userProfile.studyData.subjects,
          { name: subjectName, progress: newProgress, lastStudied: serverTimestamp() }
        ];
      }
      await updateDoc(userProfileRef, {
        "studyData.subjects": newSubjectsArray,
        "studyData.lastActivityDate": serverTimestamp(),
      });
    }
  } catch (error) {
    console.error(`Error updating progress for subject ${subjectName}:`, error);
  }
}

// Placeholder function
export async function logStudyHours(userId: string, day: string, hours: number): Promise<void> {
  const userProfileRef = doc(db, "userProfiles", userId);
   try {
    const userProfile = await getUserProfile(userId);
    if (userProfile && userProfile.studyData && userProfile.studyData.weeklyStudyHours) {
      const dayIndex = userProfile.studyData.weeklyStudyHours.findIndex(wh => wh.day === day);
      let newWeeklyHours = [...userProfile.studyData.weeklyStudyHours];
      if (dayIndex > -1) {
        newWeeklyHours[dayIndex] = { ...newWeeklyHours[dayIndex], hours: newWeeklyHours[dayIndex].hours + hours };
      } else {
        // This case should ideally not happen if weeklyStudyHours is initialized for all days
        newWeeklyHours.push({ day, hours });
      }
       await updateDoc(userProfileRef, {
        "studyData.weeklyStudyHours": newWeeklyHours,
        "studyData.lastActivityDate": serverTimestamp(),
      });
    }
  } catch (error) {
    console.error(`Error logging study hours for day ${day}:`, error);
  }
}

