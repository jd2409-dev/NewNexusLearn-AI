
import type { User } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, type Timestamp, updateDoc, arrayUnion } from "firebase/firestore";
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

export interface PastQuizQuestionDetail {
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  options: string[];
  isCorrect: boolean;
}

export interface PastQuiz {
  id: string; // Unique ID for this quiz attempt
  quizName: string;
  dateAttempted: Timestamp;
  score: number;
  totalQuestions: number;
  questions: PastQuizQuestionDetail[];
  aiReflection?: string;
}

export interface StudyData {
  overallProgress: number; // 0-100, could be an average or a more complex calculation
  subjects: SubjectProgress[];
  weeklyStudyHours: WeeklyHours[]; // Data for the last 7 days
  lastActivityDate?: Timestamp;
  pastQuizzes: PastQuiz[];
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  plan: "free" | "paid" | null; // Maintained for structure, but app logic now defaults to free with all features
  createdAt: Timestamp;
  planSelectedAt?: Timestamp;
  studyData: StudyData; // Now mandatory, initialized for new users
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
        plan: "free", // Default plan for new users, all features enabled
        createdAt: serverTimestamp(),
        planSelectedAt: serverTimestamp(), // Set plan selection time as it's now auto-assigned
        studyData: {
          overallProgress: 0,
          subjects: [],
          weeklyStudyHours: initialWeeklyHours,
          lastActivityDate: null,
          pastQuizzes: [], // Initialize pastQuizzes
        }
      });
    } catch (error) {
      console.error("Error creating user profile document:", error);
    }
  } else {
    // Ensure existing users have studyData and pastQuizzes initialized if missing
    // And ensure plan is set if it was previously null
    const currentData = userProfileSnap.data() as UserProfile;
    const updates: any = {}; // Use 'any' for flexibility in constructing update object
    let needsUpdate = false;

    if (!currentData.studyData) {
        const initialWeeklyHours: WeeklyHours[] = [
            { day: "Mon", hours: 0 }, { day: "Tue", hours: 0 }, { day: "Wed", hours: 0 },
            { day: "Thu", hours: 0 }, { day: "Fri", hours: 0 }, { day: "Sat", hours: 0 }, { day: "Sun", hours: 0 },
        ];
        updates['studyData.overallProgress'] = 0;
        updates['studyData.subjects'] = [];
        updates['studyData.weeklyStudyHours'] = initialWeeklyHours;
        updates['studyData.lastActivityDate'] = null;
        updates['studyData.pastQuizzes'] = [];
        needsUpdate = true;
    } else if (!currentData.studyData.pastQuizzes) {
        updates['studyData.pastQuizzes'] = [];
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

// This function is kept for structural completeness but with current logic,
// plan is auto-set to 'free' upon profile creation/update.
export async function setUserPlan(uid: string, plan: "free" | "paid"): Promise<void> {
  const userProfileRef = doc(db, "userProfiles", uid);
  try {
    await updateDoc(userProfileRef, { plan, planSelectedAt: serverTimestamp() });
  } catch (error) {
    console.error("Error setting user plan:", error);
    throw error;
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userProfileRef = doc(db, "userProfiles", uid);
  try {
    const docSnap = await getDoc(userProfileRef);
    if (docSnap.exists()) {
      const profile = docSnap.data() as UserProfile;
      
      // Ensure studyData, pastQuizzes, and plan are present, initialize if not (for older profiles)
      if (!profile.studyData || !profile.studyData.pastQuizzes || profile.plan === null) {
        const initialWeeklyHours: WeeklyHours[] = [
          { day: "Mon", hours: 0 }, { day: "Tue", hours: 0 }, { day: "Wed", hours: 0 },
          { day: "Thu", hours: 0 }, { day: "Fri", hours: 0 }, { day: "Sat", hours: 0 }, { day: "Sun", hours: 0 },
        ];
        const updates: any = {}; // Use 'any' for flexibility
        let needsUpdate = false;

        if (!profile.studyData) {
            updates.studyData = {
                overallProgress: 0,
                subjects: [],
                weeklyStudyHours: initialWeeklyHours,
                lastActivityDate: null,
                pastQuizzes: [],
            };
            needsUpdate = true;
        } else if (!profile.studyData.pastQuizzes) {
             updates['studyData.pastQuizzes'] = [];
             needsUpdate = true;
        }
        
        if (profile.plan === null) {
            updates.plan = "free";
            updates.planSelectedAt = serverTimestamp();
            needsUpdate = true;
        }
        
        if (needsUpdate) {
            await updateDoc(userProfileRef, updates);
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

export async function addPastQuiz(userId: string, quizData: PastQuiz): Promise<void> {
  const userProfileRef = doc(db, "userProfiles", userId);
  try {
    // Add the new quiz to the beginning of the array for chronological display (newest first)
    await updateDoc(userProfileRef, {
      "studyData.pastQuizzes": arrayUnion(quizData) // Note: arrayUnion might not be ideal if quizzes can be re-attempted with same ID.
                                             // For now, assuming quizData.id is unique per attempt.
                                             // A more robust approach for adding and ensuring order might be to fetch, prepend, and set.
                                             // However, arrayUnion is simpler if order isn't strictly newest-first or if IDs are always unique.
                                             // Let's refine this: fetch, prepend, then update.
    });

    // Refined approach for prepending:
    const userProfile = await getUserProfile(userId);
    if (userProfile && userProfile.studyData) {
        const updatedQuizzes = [quizData, ...(userProfile.studyData.pastQuizzes || [])];
        await updateDoc(userProfileRef, {
            "studyData.pastQuizzes": updatedQuizzes.slice(0, 50), // Keep last 50 quizzes for performance
            "studyData.lastActivityDate": serverTimestamp(),
        });
    }

  } catch (error) {
    console.error("Error adding past quiz:", error);
    throw error;
  }
}

export async function updatePastQuizReflection(userId: string, quizId: string, reflection: string): Promise<void> {
  const userProfileRef = doc(db, "userProfiles", userId);
  try {
    const userProfile = await getUserProfile(userId);
    if (userProfile && userProfile.studyData && userProfile.studyData.pastQuizzes) {
      const updatedQuizzes = userProfile.studyData.pastQuizzes.map(quiz => {
        if (quiz.id === quizId) {
          return { ...quiz, aiReflection: reflection };
        }
        return quiz;
      });
      await updateDoc(userProfileRef, {
        "studyData.pastQuizzes": updatedQuizzes,
        "studyData.lastActivityDate": serverTimestamp(),
      });
    }
  } catch (error) {
    console.error(`Error updating reflection for quiz ${quizId}:`, error);
    throw error;
  }
}
