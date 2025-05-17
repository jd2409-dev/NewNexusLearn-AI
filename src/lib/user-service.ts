
import type { User } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, type Timestamp, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/firebase";
import type { QuestionType } from '@/ai/flows/generate-interactive-quiz';
import { differenceInCalendarDays, isToday } from 'date-fns';

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
  questionType: QuestionType;
}

// Achievement interface is removed as achievements are being excluded.

export interface PastQuiz {
  id: string; // Unique ID for this quiz attempt
  quizName: string;
  dateAttempted: Timestamp;
  score: number;
  totalQuestions: number;
  questions: PastQuizQuestionDetail[];
  aiReflection?: string | null;
  wasTimed?: boolean | null;
  timeLimitPerQuestion?: number | null;
  timeLeft?: number | null;
  difficultyLevel?: 'easy' | 'medium' | 'hard' | null;
  icon?: string | null;
}

export interface StudyData {
  overallProgress: number; // 0-100
  subjects: SubjectProgress[];
  weeklyStudyHours: WeeklyHours[];
  lastActivityDate?: Timestamp;
  pastQuizzes: PastQuiz[];
  lastLoginDate?: Timestamp; // Kept for tracking last login, but streak logic removed
  hasCompletedOnboardingTour?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  plan: "free" | null;
  createdAt: Timestamp;
  planSelectedAt?: Timestamp;
  studyData: StudyData;
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
        plan: "free",
        createdAt: serverTimestamp(),
        planSelectedAt: serverTimestamp(),
        studyData: {
          overallProgress: 0,
          subjects: [],
          weeklyStudyHours: initialWeeklyHours,
          lastActivityDate: serverTimestamp(),
          pastQuizzes: [],
          lastLoginDate: serverTimestamp(),
          hasCompletedOnboardingTour: false,
        }
      });
    } catch (error) {
      console.error("Error creating user profile document:", error);
    }
  } else {
    const currentData = userProfileSnap.data() as UserProfile;
    const updates: any = {};
    let needsUpdate = false;

    if (!currentData.studyData) {
        const initialWeeklyHours: WeeklyHours[] = [
            { day: "Mon", hours: 0 }, { day: "Tue", hours: 0 }, { day: "Wed", hours: 0 },
            { day: "Thu", hours: 0 }, { day: "Fri", hours: 0 }, { day: "Sat", hours: 0 }, { day: "Sun", hours: 0 },
        ];
        updates.studyData = {
            overallProgress: 0,
            subjects: [],
            weeklyStudyHours: initialWeeklyHours,
            lastActivityDate: serverTimestamp(),
            pastQuizzes: [],
            lastLoginDate: serverTimestamp(),
            hasCompletedOnboardingTour: false,
        };
        needsUpdate = true;
    } else {
        if (currentData.studyData.lastLoginDate === undefined) { updates['studyData.lastLoginDate'] = serverTimestamp(); needsUpdate = true; }
        if (currentData.studyData.pastQuizzes === undefined) { updates['studyData.pastQuizzes'] = []; needsUpdate = true; }
        if (currentData.studyData.hasCompletedOnboardingTour === undefined) { updates['studyData.hasCompletedOnboardingTour'] = false; needsUpdate = true; }
        // Remove checks/defaults for gamification fields
        if ('xp' in currentData.studyData) { updates['studyData.xp'] = undefined; needsUpdate = true; } // Example of removing, better to reconstruct studyData without it
        if ('level' in currentData.studyData) { updates['studyData.level'] = undefined; needsUpdate = true; }
        if ('coins' in currentData.studyData) { updates['studyData.coins'] = undefined; needsUpdate = true; }
        if ('achievements' in currentData.studyData) { updates['studyData.achievements'] = undefined; needsUpdate = true; }
        if ('currentStreak' in currentData.studyData) { updates['studyData.currentStreak'] = undefined; needsUpdate = true; }
    }


    if (currentData.plan === null) {
        updates.plan = "free";
        updates.planSelectedAt = serverTimestamp();
        needsUpdate = true;
    }

    if (needsUpdate) {
        // Reconstruct studyData to ensure gamification fields are truly gone if they existed
        const baseStudyData = {
            overallProgress: currentData.studyData?.overallProgress ?? 0,
            subjects: currentData.studyData?.subjects ?? [],
            weeklyStudyHours: currentData.studyData?.weeklyStudyHours ?? [
              { day: "Mon", hours: 0 }, { day: "Tue", hours: 0 }, { day: "Wed", hours: 0 },
              { day: "Thu", hours: 0 }, { day: "Fri", hours: 0 }, { day: "Sat", hours: 0 }, { day: "Sun", hours: 0 },
            ],
            lastActivityDate: currentData.studyData?.lastActivityDate ?? serverTimestamp(),
            pastQuizzes: currentData.studyData?.pastQuizzes ?? [],
            lastLoginDate: currentData.studyData?.lastLoginDate ?? serverTimestamp(),
            hasCompletedOnboardingTour: currentData.studyData?.hasCompletedOnboardingTour ?? false,
        };
        updates.studyData = baseStudyData;

        try {
            await updateDoc(userProfileRef, updates);
        } catch (error) {
            console.error("Error updating existing user profile with defaults (gamification removed):", error);
        }
    }
  }
}

export async function ensureFreePlan(uid: string): Promise<void> {
  const userProfileRef = doc(db, "userProfiles", uid);
  try {
    const docSnap = await getDoc(userProfileRef);
    if (docSnap.exists()) {
      const profile = docSnap.data() as UserProfile;
      if (profile.plan === null || profile.plan === undefined) {
        await updateDoc(userProfileRef, {
            plan: "free",
            planSelectedAt: serverTimestamp()
        });
      }
    }
  } catch (error) {
    console.error("Error ensuring user plan:", error);
  }
}


export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userProfileRef = doc(db, "userProfiles", uid);
  try {
    const docSnap = await getDoc(userProfileRef);
    if (docSnap.exists()) {
      let profile = docSnap.data() as UserProfile;
      let needsUpdate = false;
      const updates: any = {};

      if (!profile.studyData) {
        const initialWeeklyHours: WeeklyHours[] = [
            { day: "Mon", hours: 0 }, { day: "Tue", hours: 0 }, { day: "Wed", hours: 0 },
            { day: "Thu", hours: 0 }, { day: "Fri", hours: 0 }, { day: "Sat", hours: 0 }, { day: "Sun", hours: 0 },
        ];
        updates.studyData = {
            overallProgress: 0, subjects: [], weeklyStudyHours: initialWeeklyHours,
            lastActivityDate: serverTimestamp(), pastQuizzes: [],
            lastLoginDate: serverTimestamp(),
            hasCompletedOnboardingTour: false,
        };
        needsUpdate = true;
      } else {
        // Ensure no gamification fields persist
        const { xp, level, coins, achievements, currentStreak, ...restOfStudyData } = profile.studyData as any; // Cast to any to access potentially removed fields
        if (xp !== undefined || level !== undefined || coins !== undefined || achievements !== undefined || currentStreak !== undefined) {
          updates['studyData'] = restOfStudyData; // Save studyData without gamification fields
          needsUpdate = true;
        }
        if (profile.studyData.lastLoginDate === undefined) { updates['studyData.lastLoginDate'] = serverTimestamp(); needsUpdate = true; }
        if (profile.studyData.pastQuizzes === undefined) { updates['studyData.pastQuizzes'] = []; needsUpdate = true; }
        if (profile.studyData.hasCompletedOnboardingTour === undefined) { updates['studyData.hasCompletedOnboardingTour'] = false; needsUpdate = true; }
      }

      if (profile.plan === null || profile.plan === undefined) {
          updates.plan = "free";
          updates.planSelectedAt = serverTimestamp();
          needsUpdate = true;
      }

      if (needsUpdate) {
          await updateDoc(userProfileRef, updates);
          const updatedDocSnap = await getDoc(userProfileRef);
          return updatedDocSnap.exists() ? (updatedDocSnap.data() as UserProfile) : null;
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
      // Removed achievement call for subject mastery
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

// addXpAndCoins function is removed.
// unlockAchievement function is removed.


export async function addPastQuiz(userId: string, quizData: PastQuiz): Promise<void> {
  const userProfileRef = doc(db, "userProfiles", userId);
  try {
    const userProfile = await getUserProfile(userId);
    if (!userProfile || !userProfile.studyData) {
        console.error("User profile or study data not found for addPastQuiz");
        return;
    }

    const sanitizedQuizData: PastQuiz = {
        id: quizData.id,
        quizName: quizData.quizName,
        dateAttempted: quizData.dateAttempted,
        score: quizData.score,
        totalQuestions: quizData.totalQuestions,
        questions: quizData.questions,
        aiReflection: quizData.aiReflection === undefined ? null : quizData.aiReflection,
        wasTimed: quizData.wasTimed === undefined ? null : quizData.wasTimed,
        timeLimitPerQuestion: quizData.timeLimitPerQuestion === undefined ? null : quizData.timeLimitPerQuestion,
        timeLeft: quizData.timeLeft === undefined ? null : quizData.timeLeft,
        difficultyLevel: quizData.difficultyLevel === undefined ? null : quizData.difficultyLevel,
        icon: quizData.icon === undefined ? null : quizData.icon,
    };

    const updatedQuizzes = [sanitizedQuizData, ...(userProfile.studyData.pastQuizzes || [])];

    await updateDoc(userProfileRef, {
        "studyData.pastQuizzes": updatedQuizzes.slice(0, 50),
        "studyData.lastActivityDate": serverTimestamp(),
    });

    // Removed XP, coins, and achievement awarding logic
  } catch (error) {
    console.error("Error adding past quiz:", error);
    throw error;
  }
}

export async function updatePastQuizReflection(userId: string, quizId: string, reflectionText: string): Promise<void> {
  const userProfileRef = doc(db, "userProfiles", userId);
  try {
    const userProfile = await getUserProfile(userId);
    if (userProfile && userProfile.studyData && userProfile.studyData.pastQuizzes) {
      const updatedQuizzes = userProfile.studyData.pastQuizzes.map(quiz => {
        if (quiz.id === quizId) {
          const sanitizedExistingQuiz: PastQuiz = {
            ...quiz,
            aiReflection: quiz.aiReflection === undefined ? null : quiz.aiReflection,
            wasTimed: quiz.wasTimed === undefined ? null : quiz.wasTimed,
            timeLimitPerQuestion: quiz.timeLimitPerQuestion === undefined ? null : quiz.timeLimitPerQuestion,
            timeLeft: quiz.timeLeft === undefined ? null : quiz.timeLeft,
            difficultyLevel: quiz.difficultyLevel === undefined ? null : quiz.difficultyLevel,
            icon: quiz.icon === undefined ? null : quiz.icon,
          };
          return { ...sanitizedExistingQuiz, aiReflection: reflectionText };
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

export async function updateUserLoginStreak(userId: string): Promise<void> {
    const userProfileRef = doc(db, "userProfiles", userId);
    try {
        const userProfile = await getUserProfile(userId);
        if (userProfile && userProfile.studyData) {
            // Streak logic removed, just update last login date
            await updateDoc(userProfileRef, {
                "studyData.lastLoginDate": serverTimestamp(),
                "studyData.lastActivityDate": serverTimestamp(),
            });
        }
    } catch (error) {
        console.error("Error updating user login date:", error);
    }
}

export async function markOnboardingTourAsCompleted(userId: string): Promise<void> {
  const userProfileRef = doc(db, "userProfiles", userId);
  try {
    await updateDoc(userProfileRef, {
      "studyData.hasCompletedOnboardingTour": true,
      "studyData.lastActivityDate": serverTimestamp(),
    });
  } catch (error) {
    console.error("Error marking onboarding tour as completed:", error);
  }
}
