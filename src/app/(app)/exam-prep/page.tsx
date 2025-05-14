
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Zap, Target, BarChartBig } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function ExamPrepPage() {
  return (
    <div className="space-y-8">
      <Card className="overflow-hidden">
        <CardHeader className="bg-primary/10 p-0">
            <div className="p-6">
                <CardTitle className="text-3xl flex items-center">
                    <ClipboardCheck className="mr-3 h-8 w-8 text-primary" /> Exam Preparation Hub
                </CardTitle>
                <CardDescription className="mt-2 text-lg">
                    Ace your exams with AI-tailored simulations, dynamic reinforcement, and performance insights.
                </CardDescription>
            </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <FeatureItem
              icon={<Zap className="h-6 w-6 text-primary" />}
              title="AI Test Simulations"
              description="Experience realistic exam conditions tailored to your board's format. Create a quiz from your materials on the Quizzes page."
              action={
                <Link href="/quizzes">
                    <Button>Go to Quizzes</Button>
                </Link>
              }
            />
            <FeatureItem
              icon={<Target className="h-6 w-6 text-primary" />}
              title="Weak Area Reinforcement"
              description="AI dynamically identifies and helps you focus on areas needing improvement. Get help from the AI Coach."
               action={
                <Link href="/ai-coach">
                    <Button variant="secondary">Ask AI Coach</Button>
                </Link>
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface FeatureItemProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    action?: React.ReactNode;
}

function FeatureItem({icon, title, description, action}: FeatureItemProps) {
    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <div className="p-2 bg-primary/10 rounded-md">{icon}</div>
                <div>
                    <CardTitle className="text-xl">{title}</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-muted-foreground">{description}</p>
            </CardContent>
            {action && <CardContent>{action}</CardContent>}
        </Card>
    )
}
