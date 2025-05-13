
"use client";

import { useState, type FormEvent, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { generateInteractiveQuiz, type GenerateInteractiveQuizOutput } from "@/ai/flows/generate-interactive-quiz";
import { fileToDataUri } from "@/lib/file-utils";
import { Loader2, FilePlus, Zap, AlertCircle, CheckCircle2, Clock, Timer } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { addPastQuiz, type PastQuiz, type PastQuizQuestionDetail } from "@/lib/user-service";
import { Timestamp } from "firebase/firestore";


type QuizQuestion = GenerateInteractiveQuizOutput["questions"][0];

export default function QuizzesPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [numberOfQuestions, setNumberOfQuestions] = useState<number>(5);
  const [quiz, setQuiz] = useState<GenerateInteractiveQuizOutput | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user, refreshUserProfile } = useAuth();

  // Timed Mode State
  const [isTimedModeEnabled, setIsTimedModeEnabled] = useState<boolean>(false);
  const [timePerQuestion, setTimePerQuestion] = useState<number>(2); // minutes
  const [quizTimeLeft, setQuizTimeLeft] = useState<number | null>(null); // seconds
  const [isQuizActive, setIsQuizActive] = useState<boolean>(false); // To control quiz flow and timer
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);


  useEffect(() => {
    if (isQuizActive && quizTimeLeft !== null && quizTimeLeft > 0) {
      timerIntervalRef.current = setInterval(() => {
        setQuizTimeLeft((prevTime) => {
          if (prevTime !== null && prevTime > 1) {
            return prevTime - 1;
          } else {
            clearInterval(timerIntervalRef.current!);
            handleTimeUp();
            return 0;
          }
        });
      }, 1000);
    } else if (quizTimeLeft === 0 && isQuizActive) {
        // This case should be handled by the interval clearing itself,
        // but as a safeguard if handleTimeUp wasn't called.
        handleTimeUp();
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isQuizActive, quizTimeLeft]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF file.",
          variant: "destructive",
        });
        setPdfFile(null);
        setPdfDataUri(null);
        return;
      }
      setPdfFile(file);
      try {
        const dataUri = await fileToDataUri(file);
        setPdfDataUri(dataUri);
        resetQuizState();
      } catch (error) {
        toast({
          title: "Error Reading File",
          description: "Could not read the PDF file.",
          variant: "destructive",
        });
      }
    }
  };

  const resetQuizState = () => {
    setQuiz(null);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setUserAnswers([]);
    setShowFeedback(false);
    setScore(0);
    setIsQuizActive(false);
    setQuizTimeLeft(null);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  const handleGenerateQuiz = async (e: FormEvent) => {
    e.preventDefault();
    if (!pdfDataUri) {
      toast({
        title: "Missing PDF",
        description: "Please upload a PDF to generate a quiz.",
        variant: "destructive",
      });
      return;
    }
    if (numberOfQuestions <= 0) {
        toast({
            title: "Invalid Number",
            description: "Number of questions must be greater than 0.",
            variant: "destructive",
        });
        return;
    }
    if (isTimedModeEnabled && timePerQuestion <=0) {
        toast({
            title: "Invalid Duration",
            description: "Time per question must be greater than 0 for timed mode.",
            variant: "destructive",
        });
        return;
    }

    setIsLoading(true);
    resetQuizState();

    try {
      const result = await generateInteractiveQuiz({ pdfDataUri, numberOfQuestions });
      if (result.questions && result.questions.length > 0) {
        setQuiz(result);
        setUserAnswers(new Array(result.questions.length).fill(""));
        setIsQuizActive(true);
        if (isTimedModeEnabled) {
          const totalDurationSeconds = result.questions.length * timePerQuestion * 60;
          setQuizTimeLeft(totalDurationSeconds);
        }
        toast({
          title: "Quiz Generated",
          description: `Successfully created a ${result.questions.length}-question quiz.`,
        });
      } else {
        setIsQuizActive(false);
        toast({
          title: "Quiz Generation Failed",
          description: "AI could not generate questions from this PDF. Try another one.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setIsQuizActive(false);
      console.error("Quiz generation error:", error);
      toast({
        title: "Quiz Generation Failed",
        description: (error as Error).message || "Could not generate quiz.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSubmit = () => {
    if (!selectedAnswer || !quiz) return;
    
    const updatedAnswers = [...userAnswers];
    updatedAnswers[currentQuestionIndex] = selectedAnswer;
    setUserAnswers(updatedAnswers);

    const currentQuestion = quiz.questions[currentQuestionIndex];
    if (selectedAnswer === currentQuestion.answer) {
      setScore(score + 1);
    }
    setShowFeedback(true);

    // If it's the last question and feedback is shown, stop the timer
    if (currentQuestionIndex === quiz.questions.length - 1) {
        setIsQuizActive(false);
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }
    }
  };

  const saveQuizResults = async (reasonForSaving: "completed" | "time_up" = "completed") => {
    if (!user || !quiz || !pdfFile) return;

    const questionsDetails: PastQuizQuestionDetail[] = quiz.questions.map((q, index) => ({
        questionText: q.question,
        userAnswer: userAnswers[index] || (reasonForSaving === "time_up" ? "Not Answered (Time Up)" : "Not Answered"),
        correctAnswer: q.answer,
        options: q.options,
        isCorrect: userAnswers[index] === q.answer,
    }));

    const pastQuizData: PastQuiz = {
        id: `${new Date().toISOString()}-${Math.random().toString(36).substring(2, 9)}`, // Unique ID
        quizName: `${pdfFile.name.replace('.pdf', '')}${isTimedModeEnabled ? ' (Timed)' : ''}` || "Untitled Quiz",
        dateAttempted: Timestamp.now(),
        score: score,
        totalQuestions: quiz.questions.length,
        questions: questionsDetails,
        wasTimed: isTimedModeEnabled,
        timeLimitPerQuestion: isTimedModeEnabled ? timePerQuestion : undefined,
        timeLeft: isTimedModeEnabled && quizTimeLeft !== null ? quizTimeLeft : undefined,
    };

    try {
        await addPastQuiz(user.uid, pastQuizData);
        await refreshUserProfile();
        toast({
            title: "Quiz Results Saved",
            description: `Your quiz results for "${pastQuizData.quizName}" have been saved.`,
        });
    } catch (error) {
        console.error("Error saving quiz result:", error);
        toast({
            title: "Error Saving Quiz",
            description: "Could not save your quiz results.",
            variant: "destructive",
        });
    }
  };

  const handleNextQuestion = async () => {
    setShowFeedback(false);
    setSelectedAnswer(null);
    if (quiz && currentQuestionIndex === quiz.questions.length - 1) {
      // This was the last question, results already saved if submitted normally, or will be by time up.
      // If submitted normally, saveQuizResults called after feedback.
      await saveQuizResults("completed");
      setIsQuizActive(false); // Quiz is over
    }
    setCurrentQuestionIndex(currentQuestionIndex + 1);
  };
  
  const handleTimeUp = async () => {
    if (!isQuizActive) return; // Prevent multiple calls

    setIsQuizActive(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setQuizTimeLeft(0);
    
    // Auto-submit logic:
    // Fill remaining answers if any (though userAnswers should be updated as they go)
    // Calculate final score based on answers submitted so far
    // Show feedback for the current question if one was selected, or just end.
    
    if (quiz && !showFeedback) { // If current question wasn't submitted and feedback shown
        // Potentially mark current question as unanswered due to time up
        const updatedAnswers = [...userAnswers];
        if (!updatedAnswers[currentQuestionIndex]) {
             updatedAnswers[currentQuestionIndex] = "Not Answered (Time Up)";
             setUserAnswers(updatedAnswers);
        }
    }
    
    setShowFeedback(true); // Show feedback for the current or last attempted question
    await saveQuizResults("time_up");
    toast({
        title: "Time's Up!",
        description: "Your quiz has been automatically submitted.",
        variant: "default"
    });
    // The UI will update to show score and "Try Another Quiz" since quiz is now over.
  };


  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const currentQuestion: QuizQuestion | undefined = quiz?.questions[currentQuestionIndex];
  const isQuizFinished = quiz && (currentQuestionIndex >= quiz.questions.length || (quizTimeLeft === 0 && isTimedModeEnabled));


  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Interactive AI Quizzes</CardTitle>
          <CardDescription>
            Upload a PDF to auto-generate quiz questions. Test your knowledge and get instant feedback.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerateQuiz} className="space-y-6">
            <div>
              <Label htmlFor="pdf-upload-quiz">Upload PDF for Quiz</Label>
              <Input id="pdf-upload-quiz" type="file" accept=".pdf" onChange={handleFileChange} className="mt-1" />
              {pdfFile && <p className="text-sm text-muted-foreground mt-2">Selected: {pdfFile.name}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="num-questions">Number of Questions</Label>
                    <Input
                        id="num-questions"
                        type="number"
                        value={numberOfQuestions}
                        onChange={(e) => setNumberOfQuestions(parseInt(e.target.value, 10))}
                        min="1"
                        max="20"
                        className="mt-1"
                    />
                </div>
                 <div>
                    <div className="flex items-center space-x-2 mt-1">
                        <Checkbox
                            id="timed-mode"
                            checked={isTimedModeEnabled}
                            onCheckedChange={(checked) => setIsTimedModeEnabled(checked as boolean)}
                        />
                        <Label htmlFor="timed-mode" className="cursor-pointer">Enable Timed Mode</Label>
                    </div>
                    {isTimedModeEnabled && (
                        <div className="mt-2">
                        <Label htmlFor="time-per-question">Time per question (minutes)</Label>
                        <Input
                            id="time-per-question"
                            type="number"
                            value={timePerQuestion}
                            onChange={(e) => setTimePerQuestion(parseInt(e.target.value, 10))}
                            min="1"
                            className="mt-1"
                        />
                        </div>
                    )}
                </div>
            </div>
            <Button type="submit" disabled={isLoading || !pdfDataUri} className="w-full">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <FilePlus className="mr-2 h-4 w-4" /> Generate Quiz
            </Button>
          </form>
        </CardContent>
      </Card>

      {isQuizActive && quizTimeLeft !== null && isTimedModeEnabled && (
        <Card className="sticky top-20 z-10 bg-primary/10">
            <CardContent className="p-3">
                <div className="flex items-center justify-center text-xl font-semibold text-primary">
                    <Timer className="mr-2 h-6 w-6" />
                    Time Left: {formatTime(quizTimeLeft)}
                </div>
            </CardContent>
        </Card>
      )}

      {quiz && currentQuestion && !isQuizFinished && (
        <Card>
          <CardHeader>
            <CardTitle>Question {currentQuestionIndex + 1} of {quiz.questions.length}</CardTitle>
            <CardDescription>{currentQuestion.question}</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={selectedAnswer || ""} onValueChange={setSelectedAnswer} disabled={showFeedback}>
              {currentQuestion.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 rounded-md hover:bg-secondary/50 transition-colors">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-4">
            {!showFeedback ? (
              <Button onClick={handleAnswerSubmit} disabled={!selectedAnswer}>
                <Zap className="mr-2 h-4 w-4" /> Submit Answer
              </Button>
            ) : (
              <div className="space-y-4">
                {selectedAnswer === currentQuestion.answer ? (
                  <div className="flex items-center p-3 rounded-md bg-green-500/10 text-green-400 border border-green-500/30">
                    <CheckCircle2 className="mr-2 h-5 w-5" /> Correct!
                  </div>
                ) : (
                  <div className="flex flex-col p-3 rounded-md bg-red-500/10 text-red-400 border border-red-500/30">
                    <div className="flex items-center">
                     <AlertCircle className="mr-2 h-5 w-5" /> Incorrect.
                    </div>
                    <span className="text-sm mt-1">Correct answer: {currentQuestion.answer}</span>
                  </div>
                )}
                {currentQuestionIndex < quiz.questions.length - 1 ? (
                  <Button onClick={handleNextQuestion} className="w-full">Next Question</Button>
                ) : (
                  // This block will now be handled by the isQuizFinished check below
                  null
                )}
              </div>
            )}
          </CardFooter>
        </Card>
      )}

      {isQuizFinished && quiz && (
           <Card className="bg-secondary/50 text-center p-6">
            <CardTitle className="text-xl mb-2">
                {quizTimeLeft === 0 && isTimedModeEnabled && !showFeedback ? "Time's Up!" : "Quiz Complete!"}
            </CardTitle>
            <CardDescription className="text-lg">Your score: {score} out of {quiz.questions.length}</CardDescription>
            <Button onClick={() => {
                resetQuizState();
            }} className="mt-4">
              Try Another Quiz
            </Button>
            <Link href="/reflection" className="mt-2 block">
                <Button variant="link">View Reflections</Button>
            </Link>
          </Card>
      )}
    </div>
  );
}

