
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { ArrowLeft, ArrowRight, CheckCircle, Compass, Home, BookOpenText, Lightbulb, ScanText, MessageSquareHeart, Edit3, FileClock, Trophy, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void; // Called when "Skip Tour" or dialog X is clicked
  onComplete: () => void; // Called when "Finish Tour" is clicked
}

const tourSteps = [
  {
    title: "Welcome to NexusLearn AI!",
    description: "Let's take a quick tour of the key features designed to supercharge your learning. The sidebar on your left is your main navigation tool. Click 'Next' to begin!",
    icon: <Compass className="h-10 w-10 text-primary mb-4" />,
  },
  {
    title: "Your Dashboard",
    description: "After this tour, you'll land on your Dashboard. It's your central hub! Track your XP, level, coins, daily streak, and quickly access key features. Keep an eye on your subject progress here.",
    icon: <Home className="h-10 w-10 text-primary mb-4" />,
  },
  {
    title: "Learning Paths",
    description: "In the sidebar on your left, click 'Learning Paths' to generate AI-powered study plans. These are tailored to your specific board (like CBSE, ICSE) and subjects, helping you optimize for exams!",
    icon: <BookOpenText className="h-10 w-10 text-primary mb-4" />,
  },
  {
    title: "Interactive Quizzes",
    description: "Find 'Quizzes' in the sidebar. Upload a PDF, and our AI will generate interactive quizzes. You can choose question types (MCQs, True/False, etc.) and difficulty. Try the timed mode for exam practice!",
    icon: <Lightbulb className="h-10 w-10 text-primary mb-4" />,
  },
  {
    title: "Textbook Analyzer",
    description: "Use the 'Textbook Analyzer' (also in the sidebar!) to upload your textbook PDFs. Ask specific questions to find answers directly within the text, or generate concise study summaries.",
    icon: <ScanText className="h-10 w-10 text-primary mb-4" />,
  },
  {
    title: "AI Coach & Writing Assistant",
    description: "Stuck on a problem? The 'AI Coach' provides step-by-step explanations. Need writing help? The 'Writing Assistant' offers feedback. Both are accessible from the sidebar.",
    icon: <div className="flex gap-2 mb-4"><MessageSquareHeart className="h-10 w-10 text-primary" /> <Edit3 className="h-10 w-10 text-primary" /></div>,
  },
  {
    title: "Reflection & Achievements",
    description: "Visit 'Reflection' (sidebar) to review past quiz performance and get AI advice. Check 'Achievements' to see the badges and trophies you've unlocked as you learn!",
    icon: <div className="flex gap-2 mb-4"><FileClock className="h-10 w-10 text-primary" /> <Trophy className="h-10 w-10 text-primary" /></div>,
  },
  {
    title: "You're All Set!",
    description: "You've completed the tour. Explore all the features NexusLearn AI has to offer using the sidebar navigation and start your personalized learning journey. Happy studying!",
    icon: <CheckCircle className="h-10 w-10 text-green-500 mb-4" />,
  },
];

export function OnboardingTour({ isOpen, onClose, onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(); // Tour finished
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose(); // Tour skipped
  };
  
  const progressPercentage = ((currentStep + 1) / tourSteps.length) * 100;


  if (!isOpen) {
    return null;
  }

  const currentStepData = tourSteps[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          {currentStepData.icon}
          <DialogTitle className="text-2xl">{currentStepData.title}</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground px-4">
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="my-4">
            <Progress value={progressPercentage} className="w-full h-2" />
            <p className="text-xs text-center text-muted-foreground mt-1">Step {currentStep + 1} of {tourSteps.length}</p>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between w-full gap-2">
          {currentStep === 0 ? (
             <Button variant="outline" onClick={handleSkip} className="w-full sm:w-auto transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 touch-manipulation">
               <X className="mr-2 h-4 w-4" /> Skip Tour
            </Button>
          ) : (
            <Button variant="outline" onClick={handlePrevious} className="w-full sm:w-auto transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 touch-manipulation">
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
          )}

          {currentStep < tourSteps.length - 1 ? (
            <Button onClick={handleNext} className="w-full sm:w-auto transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 touch-manipulation">
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={onComplete} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 touch-manipulation">
              Finish Tour <CheckCircle className="ml-2 h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
         <DialogClose 
            onClick={handleSkip} 
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
