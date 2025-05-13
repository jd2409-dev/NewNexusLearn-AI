
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpenText, ClipboardCheck, Lightbulb, Zap, BarChart3, UploadCloud, Brain, TrendingUp, Activity, Loader2, Gem, Target as LevelIcon, Award as XPIcon, Star } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import type { SubjectProgress } from "@/lib/user-service";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour"; // Import the tour component
import { markOnboardingTourAsCompleted } from "@/lib/user-service"; // Import service function
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const { user, userProfile, loading, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const [showTour, setShowTour] = useState(false);

  const studySubjects = userProfile?.studyData?.subjects || [];
  const userXp = userProfile?.studyData?.xp || 0;
  const userLevel = userProfile?.studyData?.level || 1;
  const userCoins = userProfile?.studyData?.coins || 0;
  const currentStreak = userProfile?.studyData?.currentStreak || 0;

  const trendingPercentage = 5.2; 

  useEffect(() => {
    if (userProfile && userProfile.studyData?.hasCompletedOnboardingTour === false && !loading) {
      setShowTour(true);
    }
  }, [userProfile, loading]);

  const handleTourAction = async () => {
    if (user) {
      try {
        await markOnboardingTourAsCompleted(user.uid);
        await refreshUserProfile(); // Refresh profile to get updated tour status
        setShowTour(false);
      } catch (error) {
        console.error("Error updating onboarding tour status:", error);
        toast({
          title: "Tour Error",
          description: "Could not save tour completion status. It might show again.",
          variant: "destructive",
        });
         setShowTour(false); // Still hide the tour UI-wise
      }
    }
  };


  if (loading && !userProfile) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <OnboardingTour
        isOpen={showTour}
        onClose={handleTourAction} // Skip and close are treated the same: mark as completed
        onComplete={handleTourAction}
      />
      <section className="bg-card p-6 md:p-8 rounded-lg shadow-lg">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="md:w-2/3">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Welcome to NexusLearn AI!
            </h1>
            <p className="mt-3 md:mt-4 text-base md:text-lg text-muted-foreground">
              Your personalized AI learning companion. Let's supercharge your studies today.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 md:gap-4">
              <Link href="/learning-paths">
                <Button size="lg" className="w-full sm:w-auto transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 touch-manipulation">
                  <BookOpenText className="mr-2 h-5 w-5" /> Create Learning Path
                </Button>
              </Link>
              <Link href="/quizzes">
                <Button variant="outline" size="lg" className="w-full sm:w-auto transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 touch-manipulation">
                  <Lightbulb className="mr-2 h-5 w-5" /> Start a Quiz
                </Button>
              </Link>
            </div>
          </div>
          <div className="md:w-1/3 flex justify-center mt-6 md:mt-0">
            <Image 
              src="https://picsum.photos/300/300?random=dashboard" 
              alt="AI Learning Illustration"
              data-ai-hint="AI learning" 
              width={200} 
              height={200} 
              className="rounded-full shadow-2xl object-cover"
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Your Gamified Stats</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="XP Points" value={userXp.toLocaleString()} icon={<XPIcon className="text-accent" />} />
          <StatCard title="Level" value={userLevel.toString()} icon={<LevelIcon className="text-accent" />} />
          <StatCard title="Coins" value={userCoins.toLocaleString()} icon={<Gem className="text-accent" />} />
          <StatCard title="Daily Streak" value={`${currentStreak} Day${currentStreak === 1 ? '' : 's'}`} icon={<Zap className="text-accent" />} />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DashboardCard
            title="Textbook Analyzer"
            description="Scan PDFs, find answers, and generate summaries."
            icon={<UploadCloud className="h-8 w-8 text-primary" />}
            href="/textbook-analyzer"
            actionText="Analyze Now"
          />
          <DashboardCard
            title="Exam Preparation"
            description="Simulate exams and practice for specific boards."
            icon={<ClipboardCheck className="h-8 w-8 text-primary" />}
            href="/exam-prep"
            actionText="Prepare for Exam"
          />
          <DashboardCard
            title="AI Study Coach"
            description="Get real-time assistance and explanations."
            icon={<Brain className="h-8 w-8 text-primary" />}
            href="/ai-coach"
            actionText="Ask AI Coach"
          />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Your Study Activity</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Activity className="mr-2 h-5 w-5 text-primary" />Recent Progress</CardTitle>
            <CardDescription>Your current progress in various subjects.</CardDescription>
          </CardHeader>
          <CardContent>
            {studySubjects.length > 0 ? (
              studySubjects.map((subject: SubjectProgress, index: number) => (
                <div key={index} className="space-y-2 mt-4 first:mt-0">
                  <div className="flex justify-between">
                    <span className="font-medium">{subject.name}</span>
                    <span>{subject.progress}%</span>
                  </div>
                  <Progress value={subject.progress} aria-label={`${subject.name} progress ${subject.progress}%`} />
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No study activity recorded yet. Start a learning path or take a quiz to see your progress here!</p>
            )}
          </CardContent>
           <CardFooter className="flex-col items-start gap-2 text-sm">
            {studySubjects.length > 0 && (
                <div className="flex gap-2 font-medium leading-none items-center">
                 <TrendingUp className="h-4 w-4 text-green-500" /> Trending up by {trendingPercentage}% this month
                </div>
            )}
            <div className="leading-none text-muted-foreground">
              Showing overall syllabus coverage based on your activity.
            </div>
             <div className="w-full mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <Link href="/analytics" className="w-full">
                    <Button variant="outline" className="w-full transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 touch-manipulation">
                        <BarChart3 className="mr-2 h-4 w-4" /> Detailed Analytics
                    </Button>
                 </Link>
                 <Link href="/achievements" className="w-full">
                    <Button variant="outline" className="w-full transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 touch-manipulation">
                        <Star className="mr-2 h-4 w-4" /> View Achievements
                    </Button>
                 </Link>
             </div>
          </CardFooter>
        </Card>
      </section>
    </div>
  );
}

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  actionText: string;
  disabled?: boolean;
}

function DashboardCard({ title, description, icon, href, actionText, disabled }: DashboardCardProps) {
  return (
    <Card className="hover:shadow-primary/10 transition-shadow h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
      <CardFooter>
        <Link href={href} className="w-full" aria-disabled={disabled} tabIndex={disabled ? -1 : undefined}>
          <Button variant="secondary" className="w-full transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 touch-manipulation" disabled={disabled}>{actionText}</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
