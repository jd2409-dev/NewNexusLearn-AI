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
  icon?: string; // Optional: name of a Lucide icon or path to an image
}

export interface PastQuiz {
  id: string; // Unique ID for this quiz attempt
  quizName: string;
  dateAttempted: Timestamp;
  score: number;
  totalQuestions: number;
  questions: PastQuizQuestionDetail[];
  aiReflection?: string;
  wasTimed?: boolean;
  timeLimitPerQuestion?: number;
  timeLeft?: number;
  difficultyLevel?: 'easy' | 'medium' | 'hard';
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
  plan: "free" | null;
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
        plan: "free",
        createdAt: serverTimestamp(),
        planSelectedAt: serverTimestamp(),
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

    if (currentData.plan === null) {
        updates.plan = "free";
        updates.planSelectedAt = serverTimestamp();
        needsUpdate = true;
    }

    if (needsUpdate) {
        try {
            await updateDoc(userProfileRef, updates);
        } catch (error) {
            console.error("Error updating existing user profile with gamification defaults:", error);
        }
    }
  }
}

export async function setUserPlan(uid: string, plan: "free"): Promise<void> {
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

      // Check and initialize missing gamification fields if profile exists but fields are missing
      if (!profile.studyData || profile.studyData.xp === undefined || profile.plan === null) {
        const initialWeeklyHours: WeeklyHours[] = [
            { day: "Mon", hours: 0 }, { day: "Tue", hours: 0 }, { day: "Wed", hours: 0 },
            { day: "Thu", hours: 0 }, { day: "Fri", hours: 0 }, { day: "Sat", hours: 0 }, { day: "Sun", hours: 0 },
        ];
        const updates: any = {};
        let needsUpdate = false;

        if (!profile.studyData) {
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
            
            // Level up logic
            let newLevel = currentLevel;
            if (newXp >= newLevel * XP_PER_LEVEL) {
                newLevel += Math.floor(newXp / XP_PER_LEVEL) - (currentLevel -1) ; 
                // Basic level up, can be more sophisticated
                 unlockAchievement(userId, {
                    id: `level_up_${newLevel}`,
                    name: `Reached Level ${newLevel}!`,
                    description: `Congratulations on reaching level ${newLevel}. Keep up the great work!`,
                    dateEarned: serverTimestamp(),
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

export async function unlockAchievement(userId: string, achievement: Omit<Achievement, 'dateEarned'> & { dateEarned?: Timestamp }): Promise<void> {
    const userProfileRef = doc(db, "userProfiles", userId);
    try {
        const userProfile = await getUserProfile(userId);
        if (userProfile && userProfile.studyData) {
            const alreadyEarned = userProfile.studyData.achievements.some(a => a.id === achievement.id);
            if (!alreadyEarned) {
                const newAchievement: Achievement = {
                    ...achievement,
                    dateEarned: achievement.dateEarned || serverTimestamp(),
                };
                await updateDoc(userProfileRef, {
                    "studyData.achievements": arrayUnion(newAchievement),
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
    
    const updatedQuizzes = [quizData, ...(userProfile.studyData.pastQuizzes || [])];
    
    await updateDoc(userProfileRef, {
        "studyData.pastQuizzes": updatedQuizzes.slice(0, 50),
        "studyData.lastActivityDate": serverTimestamp(),
    });

    // Award XP and Coins for completing a quiz
    let xpEarned = 50 + (quizData.score * 10); // Base XP + score bonus
    let coinsEarned = 10 + quizData.score;     // Base Coins + score bonus

    if (quizData.difficultyLevel === "medium") {
        xpEarned *= 1.2;
        coinsEarned *= 1.2;
    } else if (quizData.difficultyLevel === "hard") {
        xpEarned *= 1.5;
        coinsEarned *= 1.5;
    }
    if (quizData.wasTimed && (quizData.timeLeft === undefined || quizData.timeLeft > 0)) { // Bonus for completing timed quiz
        xpEarned += 20;
        coinsEarned += 5;
    }
    if (quizData.score === quizData.totalQuestions && quizData.totalQuestions > 0) { // Perfect score bonus
        xpEarned += 50;
        coinsEarned += 20;
        unlockAchievement(userId, {
            id: `perfect_quiz_${quizData.quizName.replace(/\s+/g, '_').toLowerCase()}`,
            name: "Quiz Perfectionist!",
            description: `Achieved a perfect score on the "${quizData.quizName}" quiz.`,
            icon: "Star"
        });
    }

    await addXpAndCoins(userId, Math.round(xpEarned), Math.round(coinsEarned));

    // Check for "First Quiz Completed" achievement
    if ((userProfile.studyData.pastQuizzes || []).length === 0) { // This means the current quiz is the first one
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

export async function updateUserLoginStreak(userId: string): Promise<void> {
    const userProfileRef = doc(db, "userProfiles", userId);
    try {
        const userProfile = await getUserProfile(userId);
        if (userProfile && userProfile.studyData) {
            const lastLogin = userProfile.studyData.lastLoginDate?.toDate();
            const today = new Date();
            let currentStreak = userProfile.studyData.currentStreak || 0;
            let coinsEarned = 0;

            if (lastLogin) {
                if (!isToday(lastLogin)) { // If last login was not today
                    const diffDays = differenceInCalendarDays(today, lastLogin);
                    if (diffDays === 1) {
                        currentStreak++; // Increment streak
                        coinsEarned = currentStreak * 5; // e.g., 5 coins per day of streak
                         if (currentStreak % 7 === 0) { // Bonus every 7 days
                            coinsEarned += 50;
                             unlockAchievement(userId, {
                                id: `streak_${currentStreak}_days`,
                                name: `${currentStreak}-Day Study Streak!`,
                                description: `You've maintained a study streak for ${currentStreak} days!`,
                                icon: "Flame"
                            });
                        }
                    } else {
                        currentStreak = 1; // Reset streak
                        coinsEarned = 5;
                    }
                     await addXpAndCoins(userId, 0, coinsEarned); // Add streak coins
                }
                 // if lastLogin was today, do nothing to streak or coins for login
            } else { // First login or lastLoginDate was not set
                currentStreak = 1;
                coinsEarned = 5;
                await addXpAndCoins(userId, 0, coinsEarned);
            }

            await updateDoc(userProfileRef, {
                "studyData.currentStreak": currentStreak,
                "studyData.lastLoginDate": serverTimestamp(), // Update last login to today
                "studyData.lastActivityDate": serverTimestamp(), // Also update general activity
            });
        }
    } catch (error) {
        console.error("Error updating user login streak:", error);
    }
}
