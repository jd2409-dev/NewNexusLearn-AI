import type { User } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, type Timestamp, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/firebase";
import type { QuestionType } from '@/ai/flows/generate-interactive-quiz'; // Import QuestionType
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

export interface Achievement {
  id: string; // e.g., "first_quiz_completed"
  name: string;
  description: string;
  dateEarned: Timestamp;
  icon?: string | null; // Optional: name of a Lucide icon or path to an image, can be null
}

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
}

export interface StudyData {
  overallProgress: number; // 0-100
  subjects: SubjectProgress[];
  weeklyStudyHours: WeeklyHours[];
  lastActivityDate?: Timestamp;
  pastQuizzes: PastQuiz[];
  xp: number;
  level: number;
  coins: number;
  achievements: Achievement[];
  currentStreak: number; // Number of consecutive days logged in
  lastLoginDate?: Timestamp; // To track daily streaks
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  plan: "free" | null; // Plan is always "free" now
  createdAt: Timestamp;
  planSelectedAt?: Timestamp;
  studyData: StudyData;
}

const XP_PER_LEVEL = 1000; // Example: 1000 XP to level up

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
        plan: "free", // Default to free plan
        createdAt: serverTimestamp(),
        planSelectedAt: serverTimestamp(), // Record when plan (even if default) was set
        studyData: {
          overallProgress: 0,
          subjects: [],
          weeklyStudyHours: initialWeeklyHours,
          lastActivityDate: serverTimestamp(),
          pastQuizzes: [],
          xp: 0,
          level: 1,
          coins: 0,
          achievements: [],
          currentStreak: 1,
          lastLoginDate: serverTimestamp(),
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
            xp: 0,
            level: 1,
            coins: 0,
            achievements: [],
            currentStreak: 1,
            lastLoginDate: serverTimestamp(),
        };
        needsUpdate = true;
    } else {
        if (currentData.studyData.xp === undefined) { updates['studyData.xp'] = 0; needsUpdate = true; }
        if (currentData.studyData.level === undefined) { updates['studyData.level'] = 1; needsUpdate = true; }
        if (currentData.studyData.coins === undefined) { updates['studyData.coins'] = 0; needsUpdate = true; }
        if (currentData.studyData.achievements === undefined) { updates['studyData.achievements'] = []; needsUpdate = true; }
        if (currentData.studyData.currentStreak === undefined) { updates['studyData.currentStreak'] = 1; needsUpdate = true; }
        if (currentData.studyData.lastLoginDate === undefined) { updates['studyData.lastLoginDate'] = serverTimestamp(); needsUpdate = true; }
        if (currentData.studyData.pastQuizzes === undefined) { updates['studyData.pastQuizzes'] = []; needsUpdate = true; }
    }

    if (currentData.plan === null) { // If somehow plan is null, set to 'free'
        updates.plan = "free";
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

// This function ensures the user has the 'free' plan set.
// It's called after login/signup if the plan isn't already set.
export async function ensureFreePlan(uid: string): Promise<void> {
  const userProfileRef = doc(db, "userProfiles", uid);
  try {
    const docSnap = await getDoc(userProfileRef);
    if (docSnap.exists()) {
      const profile = docSnap.data() as UserProfile;
      if (profile.plan === null) { // Only update if plan is explicitly null
        await updateDoc(userProfileRef, { 
            plan: "free", 
            planSelectedAt: serverTimestamp() 
        });
      } else if (profile.plan === undefined) { // Also handle if plan field is missing entirely
         await updateDoc(userProfileRef, { 
            plan: "free", 
            planSelectedAt: serverTimestamp() 
        });
      }
    }
    // If profile doesn't exist, createUserProfileDocument will handle setting the 'free' plan.
  } catch (error) {
    console.error("Error ensuring user plan:", error);
    // Not throwing error here to avoid blocking login flow, 
    // as createUserProfileDocument is the primary source for profile creation.
  }
}


export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userProfileRef = doc(db, "userProfiles", uid);
  try {
    const docSnap = await getDoc(userProfileRef);
    if (docSnap.exists()) {
      const profile = docSnap.data() as UserProfile;

      let needsUpdate = false;
      const updates: any = {};

      if (!profile.studyData) {
        const initialWeeklyHours: WeeklyHours[] = [
            { day: "Mon", hours: 0 }, { day: "Tue", hours: 0 }, { day: "Wed", hours: 0 },
            { day: "Thu", hours: 0 }, { day: "Fri", hours: 0 }, { day: "Sat", hours: 0 }, { day: "Sun", hours: 0 },
        ];
        updates.studyData = {
            overallProgress: 0, subjects: [], weeklyStudyHours: initialWeeklyHours,
            lastActivityDate: serverTimestamp(), pastQuizzes: [], xp: 0, level: 1, coins: 0,
            achievements: [], currentStreak: 1, lastLoginDate: serverTimestamp(),
        };
        needsUpdate = true;
      } else {
        if (profile.studyData.xp === undefined) { updates['studyData.xp'] = 0; needsUpdate = true; }
        if (profile.studyData.level === undefined) { updates['studyData.level'] = 1; needsUpdate = true; }
        if (profile.studyData.coins === undefined) { updates['studyData.coins'] = 0; needsUpdate = true; }
        if (profile.studyData.achievements === undefined) { updates['studyData.achievements'] = []; needsUpdate = true; }
        if (profile.studyData.currentStreak === undefined) { updates['studyData.currentStreak'] = 1; needsUpdate = true; }
        if (profile.studyData.lastLoginDate === undefined) { updates['studyData.lastLoginDate'] = serverTimestamp(); needsUpdate = true; }
        if (profile.studyData.pastQuizzes === undefined) { updates['studyData.pastQuizzes'] = []; needsUpdate = true; }
      }
      
      if (profile.plan === null || profile.plan === undefined) {
          updates.plan = "free";
          updates.planSelectedAt = serverTimestamp();
          needsUpdate = true;
      }
      
      if (needsUpdate) {
          await updateDoc(userProfileRef, updates);
          const updatedDocSnap = await getDoc(userProfileRef); // Re-fetch after update
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

export async function addXpAndCoins(userId: string, xpToAdd: number, coinsToAdd: number): Promise<void> {
    const userProfileRef = doc(db, "userProfiles", userId);
    try {
        const userProfile = await getUserProfile(userId);
        if (userProfile && userProfile.studyData) {
            const currentXp = userProfile.studyData.xp || 0;
            const currentLevel = userProfile.studyData.level || 1;
            const currentCoins = userProfile.studyData.coins || 0;

            const newXp = currentXp + xpToAdd;
            const newCoins = currentCoins + coinsToAdd;
            
            let newLevel = currentLevel;
            if (newXp >= newLevel * XP_PER_LEVEL) {
                newLevel += Math.floor(newXp / XP_PER_LEVEL) - (currentLevel -1) ; 
                 unlockAchievement(userId, {
                    id: `level_up_${newLevel}`,
                    name: `Reached Level ${newLevel}!`,
                    description: `Congratulations on reaching level ${newLevel}. Keep up the great work!`,
                    icon: "Award",
                });
            }
            
            await updateDoc(userProfileRef, {
                "studyData.xp": newXp,
                "studyData.level": newLevel,
                "studyData.coins": newCoins,
                "studyData.lastActivityDate": serverTimestamp(),
            });
        }
    } catch (error) {
        console.error("Error adding XP and Coins:", error);
    }
}

export async function unlockAchievement(userId: string, achievement: Omit<Achievement, 'dateEarned' | 'icon'> & { dateEarned?: Timestamp, icon?: string }): Promise<void> {
    const userProfileRef = doc(db, "userProfiles", userId);
    try {
        const userProfile = await getUserProfile(userId);
        if (userProfile && userProfile.studyData) {
            const alreadyEarned = userProfile.studyData.achievements.some(a => a.id === achievement.id);
            if (!alreadyEarned) {
                const newAchievementData: Achievement = {
                    id: achievement.id,
                    name: achievement.name,
                    description: achievement.description,
                    dateEarned: achievement.dateEarned || serverTimestamp(),
                    icon: achievement.icon === undefined ? null : achievement.icon,
                };
                await updateDoc(userProfileRef, {
                    "studyData.achievements": arrayUnion(newAchievementData),
                    "studyData.lastActivityDate": serverTimestamp(),
                });
            }
        }
    } catch (error) {
        console.error(`Error unlocking achievement ${achievement.id}:`, error);
    }
}


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
        questions: quizData.questions, // Assuming PastQuizQuestionDetail is always fully populated or sanitized at source
        aiReflection: quizData.aiReflection === undefined ? null : quizData.aiReflection,
        wasTimed: quizData.wasTimed === undefined ? null : quizData.wasTimed,
        timeLimitPerQuestion: quizData.timeLimitPerQuestion === undefined ? null : quizData.timeLimitPerQuestion,
        timeLeft: quizData.timeLeft === undefined ? null : quizData.timeLeft,
        difficultyLevel: quizData.difficultyLevel === undefined ? null : quizData.difficultyLevel,
    };
    
    const updatedQuizzes = [sanitizedQuizData, ...(userProfile.studyData.pastQuizzes || [])];
    
    await updateDoc(userProfileRef, {
        "studyData.pastQuizzes": updatedQuizzes.slice(0, 50), // Keep only last 50 quizzes
        "studyData.lastActivityDate": serverTimestamp(),
    });

    let xpEarned = 50 + (sanitizedQuizData.score * 10); 
    let coinsEarned = 10 + sanitizedQuizData.score;     

    if (sanitizedQuizData.difficultyLevel === "medium") {
        xpEarned *= 1.2;
        coinsEarned *= 1.2;
    } else if (sanitizedQuizData.difficultyLevel === "hard") {
        xpEarned *= 1.5;
        coinsEarned *= 1.5;
    }
    if (sanitizedQuizData.wasTimed && (sanitizedQuizData.timeLeft === undefined || sanitizedQuizData.timeLeft === null || sanitizedQuizData.timeLeft > 0)) { 
        xpEarned += 20;
        coinsEarned += 5;
    }
    if (sanitizedQuizData.score === sanitizedQuizData.totalQuestions && sanitizedQuizData.totalQuestions > 0) { 
        xpEarned += 50;
        coinsEarned += 20;
        unlockAchievement(userId, {
            id: `perfect_quiz_${sanitizedQuizData.quizName.replace(/\s+/g, '_').toLowerCase()}`,
            name: "Quiz Perfectionist!",
            description: `Achieved a perfect score on the "${sanitizedQuizData.quizName}" quiz.`,
            icon: "Star"
        });
    }

    await addXpAndCoins(userId, Math.round(xpEarned), Math.round(coinsEarned));

    if ((userProfile.studyData.pastQuizzes || []).length === 0) { 
        unlockAchievement(userId, {
            id: "first_quiz_completed",
            name: "Quiz Starter",
            description: "Completed your first quiz! Keep learning!",
            icon: "Milestone",
        });
    }

  } catch (error) {
    console.error("Error adding past quiz or awarding points:", error);
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
          // Ensure existing quiz data is sanitized before spreading, though it should be already
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
        return quiz; // Other quizzes should already be sanitized from when they were added
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
            const lastLoginTimestamp = userProfile.studyData.lastLoginDate;
            const lastLogin = lastLoginTimestamp ? lastLoginTimestamp.toDate() : null;
            const today = new Date();
            let currentStreak = userProfile.studyData.currentStreak || 0;
            let coinsEarned = 0;

            if (lastLogin) {
                if (!isToday(lastLogin)) { 
                    const diffDays = differenceInCalendarDays(today, lastLogin);
                    if (diffDays === 1) {
                        currentStreak++; 
                        coinsEarned = currentStreak * 5; 
                         if (currentStreak % 7 === 0) { 
                            coinsEarned += 50;
                             unlockAchievement(userId, {
                                id: `streak_${currentStreak}_days`,
                                name: `${currentStreak}-Day Study Streak!`,
                                description: `You've maintained a study streak for ${currentStreak} days!`,
                                icon: "Flame"
                            });
                        }
                    } else {
                        currentStreak = 1; 
                        coinsEarned = 5;
                    }
                     if (coinsEarned > 0) await addXpAndCoins(userId, 0, coinsEarned); 
                }
            } else { 
                currentStreak = 1;
                coinsEarned = 5;
                await addXpAndCoins(userId, 0, coinsEarned);
            }

            await updateDoc(userProfileRef, {
                "studyData.currentStreak": currentStreak,
                "studyData.lastLoginDate": serverTimestamp(), 
                "studyData.lastActivityDate": serverTimestamp(), 
            });
        }
    } catch (error) {
        console.error("Error updating user login streak:", error);
    }
}
