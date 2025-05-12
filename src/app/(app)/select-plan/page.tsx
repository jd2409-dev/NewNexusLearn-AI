
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { setUserPlan } from "@/lib/user-service";
import { Loader2, CheckCircle2, ShieldCheck, Gem } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NexusLearnLogo } from "@/components/icons/nexuslearn-logo";

const freePlanFeatures = [
  "Standard AI-Powered Study Assistance: Board-aligned lessons for basic study help.",
  "Limited Textbook Upload & AI Search: AI searches answers (basic text responses).",
  "Basic Homework Helper: AI assists, no detailed step-by-step guidance.",
  "Standard Exam Preparation: Practice quizzes, no dynamic difficulty.",
  "Limited AI-Generated Study Summaries: Short text summaries only.",
  "Standard Study Analytics: Basic progress tracking.",
  "Offline Mode: Download limited study materials.",
  "Basic AI Tutor Assistance: General interaction, no live coaching.",
];

const paidPlanFeatures = [
  "Issac Groot N1 AI Integration: Advanced reinforcement learning for deeper mastery.",
  "Full Access to 'Upload Textbook & Ask AI': Precise page references, detailed answers.",
  "Unlimited Homework Help: Step-by-step solutions and explanations.",
  "Adaptive Exam Preparation & Difficulty Scaling: AI adjusts quiz complexity.",
  "Multi-Format Study Summaries: Detailed Text, Audio, Mind Maps, Video Summaries.",
  "Advanced Study Analytics & Reinforcement Learning: Tracks weak areas, personalizes flow.",
  "Live AI Study Coaching: Real-time explanations, detailed subject tutoring.",
  "Unlimited AI Tutor Sessions: Subject-specific tutoring on demand.",
  "Full Offline Mode: Complete access to materials offline.",
];

interface PlanCardProps {
  title: string;
  price: string;
  description: string;
  features: string[];
  onSelectPlan: () => Promise<void>;
  isLoading: boolean;
  isPrimary?: boolean;
  icon?: React.ReactNode;
}

function PlanCard({ title, price, description, features, onSelectPlan, isLoading, isPrimary, icon }: PlanCardProps) {
  return (
    <Card className={`flex flex-col ${isPrimary ? 'border-primary shadow-lg' : ''}`}>
      <CardHeader className="items-center text-center">
        {icon && <div className="mb-3">{icon}</div>}
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription className="text-lg font-semibold">{price}</CardDescription>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="flex-grow">
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={onSelectPlan} 
          disabled={isLoading} 
          className="w-full"
          variant={isPrimary ? 'default' : 'secondary'}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Choose {title}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function SelectPlanPage() {
  const { user, refreshUserProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoadingFree, setIsLoadingFree] = useState(false);
  const [isLoadingPaid, setIsLoadingPaid] = useState(false);

  const handleSelectPlan = async (plan: "free" | "paid") => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to select a plan.", variant: "destructive" });
      router.push("/login");
      return;
    }

    if (plan === 'free') setIsLoadingFree(true);
    else setIsLoadingPaid(true);

    try {
      await setUserPlan(user.uid, plan);
      await refreshUserProfile(); // Refresh context with new plan info
      toast({ title: "Plan Selected!", description: `You've successfully selected the ${plan} plan.` });
      router.push("/dashboard");
    } catch (error) {
      toast({ title: "Error", description: "Could not save your plan selection. Please try again.", variant: "destructive" });
      console.error("Error selecting plan:", error);
    } finally {
      if (plan === 'free') setIsLoadingFree(false);
      else setIsLoadingPaid(false);
    }
  };
  
  // If user somehow lands here without being logged in (e.g. direct navigation)
  // and auth state is still loading, show a loader. If auth is done and no user, redirect.
  // This is a fallback, main protection is in (app)/layout.tsx
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/30">
        <NexusLearnLogo className="h-20 w-auto text-primary mb-6" />
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading user data...</p>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 py-12 px-4 sm:px-6 lg:px-8">
      <header className="text-center mb-12">
        <NexusLearnLogo className="h-12 w-auto mx-auto text-primary mb-4" />
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Choose Your Learning Path
        </h1>
        <p className="mt-4 text-xl text-muted-foreground">
          Select the plan that best fits your study needs.
        </p>
      </header>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <PlanCard
          title="Free Plan"
          price="Always Free"
          description="Basic AI learning tools to get you started."
          features={freePlanFeatures}
          onSelectPlan={() => handleSelectPlan("free")}
          isLoading={isLoadingFree}
          icon={<ShieldCheck className="h-12 w-12 text-muted-foreground" />}
        />
        <PlanCard
          title="Paid Plan"
          price="$5/month"
          description="Advanced AI tools for comprehensive learning."
          features={paidPlanFeatures}
          onSelectPlan={() => handleSelectPlan("paid")}
          isLoading={isLoadingPaid}
          isPrimary
          icon={<Gem className="h-12 w-12 text-primary" />}
        />
      </div>
      <footer className="text-center mt-12 text-muted-foreground text-sm">
         <p>The Paid Plan includes Issac Groot N1 AI Integration. You can find more about Issac Groot N1 <a href="https://github.com/IssacGrootN1" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">here</a>.</p>
        <p>© {new Date().getFullYear()} NexusLearn AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
