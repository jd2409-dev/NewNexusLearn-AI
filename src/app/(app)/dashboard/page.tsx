
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpenText, ClipboardCheck, Lightbulb, Zap, BarChart3, UploadCloud, Brain, TrendingUp, Activity, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import type { SubjectProgress } from "@/lib/user-service";

export default function DashboardPage() {
  const { userProfile, loading } = useAuth();

  const studySubjects = userProfile?.studyData?.subjects || [];

  // Example: Calculate an overall "trending up" percentage or use a placeholder.
  // This would ideally come from more detailed analytics data.
  const trendingPercentage = 5.2; 

  if (loading && !userProfile) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="bg-card p-8 rounded-lg shadow-lg">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="md:w-2/3">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Welcome to NexusLearn AI!
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Your personalized AI learning companion. Let's supercharge your studies today.
            </p>
            <div className="mt-6 flex gap-4">
              <Link href="/learning-paths">
                <Button size="lg">
                  <BookOpenText className="mr-2 h-5 w-5" /> Create Learning Path
                </Button>
              </Link>
              <Link href="/quizzes">
                <Button variant="outline" size="lg">
                  <Lightbulb className="mr-2 h-5 w-5" /> Start a Quiz
                </Button>
              </Link>
            </div>
          </div>
          <div className="md:w-1/3 flex justify-center">
            <Image 
              src="https://picsum.photos/300/300?random=dashboard" 
              alt="AI Learning Illustration"
              data-ai-hint="AI learning" 
              width={250} 
              height={250} 
              className="rounded-full shadow-2xl object-cover"
            />
          </div>
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
                    <span>{subject.name}</span>
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
                <div className="flex gap-2 font-medium leading-none">
                Trending up by {trendingPercentage}% this month <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
            )}
            <div className="leading-none text-muted-foreground">
              Showing overall syllabus coverage based on your activity.
            </div>
             <Link href="/analytics" className="w-full mt-4">
                <Button variant="outline" className="w-full">
                    <BarChart3 className="mr-2 h-4 w-4" /> View Detailed Analytics
                </Button>
             </Link>
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
}

function DashboardCard({ title, description, icon, href, actionText }: DashboardCardProps) {
  return (
    <Card className="hover:shadow-primary/10 transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
      <CardFooter>
        <Link href={href} className="w-full">
          <Button variant="secondary" className="w-full">{actionText}</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
