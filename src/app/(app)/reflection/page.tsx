
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, FileClock, Sparkles, CheckCircle2, AlertCircle, Info } from "lucide-react";
import type { PastQuiz, PastQuizQuestionDetail } from "@/lib/user-service";
import { generateQuizReflection, type GenerateQuizReflectionOutput } from "@/ai/flows/generate-quiz-reflection";
import { updatePastQuizReflection } from "@/lib/user-service";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

export default function ReflectionPage() {
  const { user, userProfile, loading: authLoading, refreshUserProfile } = useAuth();
  const [pastQuizzes, setPastQuizzes] = useState<PastQuiz[]>([]);
  const [isLoadingReflection, setIsLoadingReflection] = useState<Record<string, boolean>>({}); // quizId: isLoading
  const { toast } = useToast();

  useEffect(() => {
    if (userProfile?.studyData?.pastQuizzes) {
      // Sort quizzes by date, newest first
      const sortedQuizzes = [...userProfile.studyData.pastQuizzes].sort((a, b) => {
        const dateA = a.dateAttempted.toDate ? a.dateAttempted.toDate() : new Date(a.dateAttempted as any);
        const dateB = b.dateAttempted.toDate ? b.dateAttempted.toDate() : new Date(b.dateAttempted as any);
        return dateB.getTime() - dateA.getTime();
      });
      setPastQuizzes(sortedQuizzes);
    }
  }, [userProfile]);

  const handleGenerateReflection = async (quiz: PastQuiz) => {
    if (!user) return;
    setIsLoadingReflection(prev => ({ ...prev, [quiz.id]: true }));
    try {
      const result = await generateQuizReflection({
        quizName: quiz.quizName,
        questions: quiz.questions,
      });
      await updatePastQuizReflection(user.uid, quiz.id, result.reflectionText);
      await refreshUserProfile(); // This will trigger useEffect to update pastQuizzes state
      toast({
        title: "Reflection Generated",
        description: `AI has provided feedback for "${quiz.quizName}".`,
      });
    } catch (error) {
      console.error("Error generating reflection:", error);
      toast({
        title: "Reflection Failed",
        description: (error as Error).message || "Could not generate reflection for this quiz.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingReflection(prev => ({ ...prev, [quiz.id]: false }));
    }
  };
  
  const formatDate = (timestamp: any): string => {
    if (!timestamp) return "N/A";
    // Firebase Timestamps have a toDate() method
    if (timestamp.toDate) {
      return format(timestamp.toDate(), "PPP p"); // eg. Jun 21, 2023, 2:30 PM
    }
    // Fallback for JS Date objects (should ideally not happen if Timestamps are stored)
    try {
       return format(new Date(timestamp), "PPP p");
    } catch {
       return "Invalid Date";
    }
  };


  if (authLoading && !userProfile) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <FileClock className="mr-3 h-7 w-7 text-primary" /> Quiz Reflections
          </CardTitle>
          <CardDescription>
            Review your past quiz attempts, understand your mistakes, and get AI-powered advice for improvement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pastQuizzes.length === 0 && !authLoading && (
            <div className="text-center py-10">
              <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">No quiz attempts found.</p>
              <p className="text-sm text-muted-foreground">Complete some quizzes to see your reflections here.</p>
            </div>
          )}
          {pastQuizzes.length > 0 && (
            <Accordion type="single" collapsible className="w-full">
              {pastQuizzes.map((quiz) => (
                <AccordionItem value={quiz.id} key={quiz.id}>
                  <AccordionTrigger>
                    <div className="flex justify-between w-full items-center pr-2">
                        <span className="truncate mr-2">{quiz.quizName}</span>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{formatDate(quiz.dateAttempted)}</span>
                            <span>Score: {quiz.score}/{quiz.totalQuestions}</span>
                        </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 p-4 bg-secondary/30 rounded-b-md">
                    <div>
                      <h4 className="font-semibold mb-2 text-lg">Quiz Details:</h4>
                      {quiz.questions.map((q, index) => (
                        <Card key={index} className={`mb-3 p-4 ${q.isCorrect ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
                          <p className="font-medium mb-1">Q{index + 1}: {q.questionText}</p>
                          <p className="text-sm">Your answer: <span className={q.isCorrect ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>{q.userAnswer}</span></p>
                          {!q.isCorrect && <p className="text-sm">Correct answer: {q.correctAnswer}</p>}
                          <div className="mt-1">
                            {q.isCorrect ? 
                                <CheckCircle2 className="h-5 w-5 text-green-500 inline-block mr-1" /> :
                                <AlertCircle className="h-5 w-5 text-red-500 inline-block mr-1" /> 
                            }
                            <span className={`text-sm font-semibold ${q.isCorrect ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                {q.isCorrect ? "Correct" : "Incorrect"}
                            </span>
                          </div>
                        </Card>
                      ))}
                    </div>
                    <div className="pt-2">
                      <h4 className="font-semibold mb-2 text-lg">AI Reflection:</h4>
                      {quiz.aiReflection ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-background rounded-md shadow whitespace-pre-wrap">
                          {quiz.aiReflection}
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleGenerateReflection(quiz)}
                          disabled={isLoadingReflection[quiz.id]}
                          className="w-full sm:w-auto"
                        >
                          {isLoadingReflection[quiz.id] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          <Sparkles className="mr-2 h-4 w-4" /> Get AI Reflection
                        </Button>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
        {pastQuizzes.length > 0 && (
             <CardFooter>
                <p className="text-xs text-muted-foreground">
                    Reflections are AI-generated. Always use your critical thinking and consult with teachers.
                </p>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}

