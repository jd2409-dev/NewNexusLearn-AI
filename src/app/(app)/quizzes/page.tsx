
"use client";

import { useState, type FormEvent, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { generateInteractiveQuiz, type GenerateInteractiveQuizOutput, type QuizQuestion, type QuestionType, type GenerateInteractiveQuizInput } from "@/ai/flows/generate-interactive-quiz";
import { fileToDataUri } from "@/lib/file-utils";
import { Loader2, FilePlus, Zap, AlertCircle, CheckCircle2, Clock, Timer, StopCircle, ListChecks, ShieldQuestion } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { addPastQuiz, type PastQuiz, type PastQuizQuestionDetail } from "@/lib/user-service";
import { Timestamp } from "firebase/firestore";
import Link from 'next/link';

const difficultyLevels = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
] as const;

const allQuestionTypes: { id: QuestionType; label: string }[] = [
  { id: "mcq", label: "Multiple Choice (MCQ)" },
  { id: "trueFalse", label: "True/False" },
  { id: "fillInTheBlanks", label: "Fill in the Blanks" },
  { id: "shortAnswer", label: "Short Answer (Q&A)" },
];


export default function QuizzesPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [numberOfQuestions, setNumberOfQuestions] = useState<number>(5);
  const [difficultyLevel, setDifficultyLevel] = useState<GenerateInteractiveQuizInput['difficultyLevel']>('medium');
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<QuestionType[]>(['mcq']);
  
  const [quiz, setQuiz] = useState<GenerateInteractiveQuizOutput | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedRadioAnswer, setSelectedRadioAnswer] = useState<string | null>(null);
  const [textInputAnswer, setTextInputAnswer] = useState<string>(""); // For fill-in-the-blanks and short-answer

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
  const [isQuizActive, setIsQuizActive] = useState<boolean>(false); 
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
        toast({ title: "Invalid File Type", description: "Please upload a PDF file.", variant: "destructive" });
        setPdfFile(null); setPdfDataUri(null); return;
      }
      setPdfFile(file);
      try {
        const dataUri = await fileToDataUri(file);
        setPdfDataUri(dataUri);
        resetQuizState(false); // Don't reset form inputs
      } catch (error) {
        toast({ title: "Error Reading File", description: "Could not read the PDF file.", variant: "destructive" });
      }
    }
  };

  const resetQuizState = (resetFormInputs: boolean = true) => {
    setQuiz(null);
    setCurrentQuestionIndex(0);
    setSelectedRadioAnswer(null);
    setTextInputAnswer("");
    setUserAnswers([]);
    setShowFeedback(false);
    setScore(0);
    setIsQuizActive(false);
    setQuizTimeLeft(null);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    if (resetFormInputs) {
        setPdfFile(null);
        setPdfDataUri(null);
        // setNumberOfQuestions(5); // Keep user's preference
        // setDifficultyLevel('medium'); // Keep user's preference
        // setSelectedQuestionTypes(['mcq']); // Keep user's preference
    }
  };

  const handleGenerateQuiz = async (e: FormEvent) => {
    e.preventDefault();
    if (!pdfDataUri) {
      toast({ title: "Missing PDF", description: "Please upload a PDF to generate a quiz.", variant: "destructive" }); return;
    }
    if (numberOfQuestions <= 0 || numberOfQuestions > 20) {
      toast({ title: "Invalid Number", description: "Number of questions must be between 1 and 20.", variant: "destructive" }); return;
    }
    if (selectedQuestionTypes.length === 0) {
      toast({ title: "No Question Types", description: "Please select at least one question type.", variant: "destructive" }); return;
    }
    if (isTimedModeEnabled && timePerQuestion <=0) {
      toast({ title: "Invalid Duration", description: "Time per question must be greater than 0 for timed mode.", variant: "destructive" }); return;
    }

    setIsLoading(true);
    resetQuizState(false); // Don't reset form inputs, only quiz active state

    try {
      const result = await generateInteractiveQuiz({ 
        pdfDataUri, 
        numberOfQuestions,
        difficultyLevel,
        questionTypes: selectedQuestionTypes.length > 0 ? selectedQuestionTypes : undefined // Pass undefined if empty to use default in flow
      });
      if (result.questions && result.questions.length > 0) {
        setQuiz(result);
        setUserAnswers(new Array(result.questions.length).fill(""));
        setIsQuizActive(true);
        if (isTimedModeEnabled) {
          const totalDurationSeconds = result.questions.length * timePerQuestion * 60;
          setQuizTimeLeft(totalDurationSeconds);
        }
        toast({ title: "Quiz Generated", description: `Successfully created a ${result.questions.length}-question quiz.` });
      } else {
        setIsQuizActive(false);
        toast({ title: "Quiz Generation Failed", description: "AI could not generate questions from this PDF. Try another one or adjust parameters.", variant: "destructive" });
      }
    } catch (error) {
      setIsQuizActive(false);
      console.error("Quiz generation error:", error);
      toast({ title: "Quiz Generation Failed", description: (error as Error).message || "Could not generate quiz.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const currentQuestion: QuizQuestion | undefined = quiz?.questions[currentQuestionIndex];

  const handleAnswerSubmit = () => {
    if (!quiz || !currentQuestion) return;
    
    let currentAnswer = "";
    if (currentQuestion.type === 'mcq' || currentQuestion.type === 'trueFalse') {
      if (!selectedRadioAnswer) {
        toast({ title: "No Answer Selected", description: "Please select an answer.", variant: "default" });
        return;
      }
      currentAnswer = selectedRadioAnswer;
    } else if (currentQuestion.type === 'fillInTheBlanks' || currentQuestion.type === 'shortAnswer') {
      if (!textInputAnswer.trim()) {
         toast({ title: "No Answer Provided", description: "Please enter your answer.", variant: "default" });
         return;
      }
      currentAnswer = textInputAnswer.trim();
    }

    const updatedAnswers = [...userAnswers];
    updatedAnswers[currentQuestionIndex] = currentAnswer;
    setUserAnswers(updatedAnswers);

    let isCorrect = false;
    if (currentQuestion.type === 'fillInTheBlanks' || currentQuestion.type === 'shortAnswer') {
        isCorrect = currentAnswer.toLowerCase() === currentQuestion.answer.toLowerCase();
    } else { // mcq or trueFalse
        isCorrect = currentAnswer === currentQuestion.answer;
    }

    if (isCorrect) {
      setScore(score + 1);
    }
    setShowFeedback(true);

    if (currentQuestionIndex === quiz.questions.length - 1) {
        setIsQuizActive(false); // Stop timer for last question upon submission
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const saveQuizResults = async (reasonForSaving: "completed" | "time_up" | "ended_early" = "completed") => {
    if (!user || !quiz || !pdfFile) return;

    const questionsDetails: PastQuizQuestionDetail[] = quiz.questions.map((q, index) => ({
        questionText: q.question,
        userAnswer: userAnswers[index] || (reasonForSaving === "time_up" ? "Not Answered (Time Up)" : reasonForSaving === "ended_early" ? "Not Answered (Ended Early)" : "Not Answered"),
        correctAnswer: q.answer,
        options: q.options || [],
        isCorrect: userAnswers[index]?.toLowerCase() === q.answer.toLowerCase(), // Simplified, might need adjustment for shortAnswer
        questionType: q.type,
    }));

    const pastQuizData: PastQuiz = {
        id: `${new Date().toISOString()}-${Math.random().toString(36).substring(2, 9)}`,
        quizName: `${pdfFile.name.replace('.pdf', '')} (${difficultyLevel}, ${selectedQuestionTypes.join('/')})${isTimedModeEnabled ? ' (Timed)' : ''}` || "Untitled Quiz",
        dateAttempted: Timestamp.now(),
        score: score,
        totalQuestions: quiz.questions.length,
        questions: questionsDetails,
        wasTimed: isTimedModeEnabled,
        timeLimitPerQuestion: isTimedModeEnabled ? timePerQuestion : undefined,
        timeLeft: isTimedModeEnabled && quizTimeLeft !== null ? quizTimeLeft : undefined,
        difficultyLevel: difficultyLevel,
    };

    try {
        await addPastQuiz(user.uid, pastQuizData);
        await refreshUserProfile();
        toast({ title: "Quiz Results Saved", description: `Your quiz results for "${pastQuizData.quizName}" have been saved.` });
    } catch (error) {
        console.error("Error saving quiz result:", error);
        toast({ title: "Error Saving Quiz", description: "Could not save your quiz results.", variant: "destructive" });
    }
  };

  const handleNextQuestion = async () => {
    setShowFeedback(false);
    setSelectedRadioAnswer(null);
    setTextInputAnswer(""); 
    if (quiz && currentQuestionIndex === quiz.questions.length - 1) {
      await saveQuizResults("completed");
      setIsQuizActive(false); // Quiz is over
    }
    setCurrentQuestionIndex(currentQuestionIndex + 1);
  };
  
  const handleTimeUp = async () => {
    if (!isQuizActive && quizTimeLeft !== 0) return; // Prevent multiple calls unless time actually ran out
    
    setIsQuizActive(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setQuizTimeLeft(0);
    
    if (quiz && !showFeedback) { 
        const updatedAnswers = [...userAnswers];
        if (!updatedAnswers[currentQuestionIndex] && currentQuestion) { // If current question has not been answered
             updatedAnswers[currentQuestionIndex] = "Not Answered (Time Up)";
             setUserAnswers(updatedAnswers);
        }
    }
    
    setShowFeedback(true); 
    await saveQuizResults("time_up");
    toast({ title: "Time's Up!", description: "Your quiz has been automatically submitted.", variant: "default" });
  };

  const handleEndTestEarly = async () => {
    if (!isQuizActive || !quiz) return;
    setIsQuizActive(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    // If current question has an answer typed but not submitted, consider it.
    // Otherwise, mark unattempted questions.
    const updatedAnswers = [...userAnswers];
    if (currentQuestion && !updatedAnswers[currentQuestionIndex]) {
        const currentVal = (currentQuestion.type === 'fillInTheBlanks' || currentQuestion.type === 'shortAnswer') ? textInputAnswer : selectedRadioAnswer;
        if (currentVal && currentVal.trim() !== "") {
            updatedAnswers[currentQuestionIndex] = currentVal.trim();
             // Check if this answer is correct for score
            let isCorrect = false;
            if (currentQuestion.type === 'fillInTheBlanks' || currentQuestion.type === 'shortAnswer') {
                isCorrect = currentVal.trim().toLowerCase() === currentQuestion.answer.toLowerCase();
            } else {
                isCorrect = currentVal === currentQuestion.answer;
            }
            if(isCorrect) setScore(prevScore => prevScore +1); // Manually adjust score for this one last answer
        } else {
            updatedAnswers[currentQuestionIndex] = "Not Answered (Ended Early)";
        }
    }
     for (let i = currentQuestionIndex + 1; i < quiz.questions.length; i++) {
        updatedAnswers[i] = "Not Answered (Ended Early)";
    }
    setUserAnswers(updatedAnswers);

    setShowFeedback(true); // Show feedback for the current or last attempted question
    await saveQuizResults("ended_early");
    toast({ title: "Quiz Ended", description: "Your quiz has been submitted.", variant: "default" });
  };


  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isQuizFinished = quiz && (currentQuestionIndex >= quiz.questions.length || (quizTimeLeft === 0 && isTimedModeEnabled && !isQuizActive ));


  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Interactive AI Quizzes</CardTitle>
          <CardDescription>
            Upload a PDF, choose your settings, and test your knowledge with AI-generated questions.
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
                  id="num-questions" type="number" value={numberOfQuestions}
                  onChange={(e) => {
                    const rawValue = e.target.value;
                    const newNum = parseInt(rawValue, 10);
                    if (!isNaN(newNum)) {
                      setNumberOfQuestions(newNum > 20 ? 20 : newNum < 1 ? 1 : newNum);
                    } else if (rawValue === "") {
                      setNumberOfQuestions(1); 
                    }
                  }}
                  min="1" max="20" className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="difficulty-level">Difficulty Level</Label>
                <Select value={difficultyLevel} onValueChange={(val) => setDifficultyLevel(val as GenerateInteractiveQuizInput['difficultyLevel'])}>
                  <SelectTrigger id="difficulty-level" className="mt-1">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyLevels.map(level => <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
                <Label>Question Types (select at least one)</Label>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                    {allQuestionTypes.map(type => (
                        <div key={type.id} className="flex items-center space-x-2">
                            <Checkbox
                                id={`qtype-${type.id}`}
                                checked={selectedQuestionTypes.includes(type.id)}
                                onCheckedChange={(checked) => {
                                    setSelectedQuestionTypes(prev => 
                                        checked ? [...prev, type.id] : prev.filter(t => t !== type.id)
                                    );
                                }}
                            />
                            <Label htmlFor={`qtype-${type.id}`} className="font-normal cursor-pointer">{type.label}</Label>
                        </div>
                    ))}
                </div>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                  <Checkbox id="timed-mode" checked={isTimedModeEnabled} onCheckedChange={(checked) => setIsTimedModeEnabled(checked as boolean)} />
                  <Label htmlFor="timed-mode" className="cursor-pointer">Enable Timed Mode</Label>
              </div>
              {isTimedModeEnabled && (
                  <div className="mt-2">
                  <Label htmlFor="time-per-question">Time per question (minutes)</Label>
                  <Input id="time-per-question" type="number" value={timePerQuestion}
                      onChange={(e) => {
                        const rawValue = e.target.value;
                        const newNum = parseInt(rawValue, 10);
                        if (!isNaN(newNum)) {
                            setTimePerQuestion(newNum < 1 ? 1 : newNum);
                        } else if (rawValue === "") {
                            setTimePerQuestion(1); 
                        }
                      }}
                      min="1" className="mt-1"
                  />
                  </div>
              )}
            </div>

            <Button type="submit" disabled={isLoading || !pdfDataUri || selectedQuestionTypes.length === 0} className="w-full">
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
            <div className="flex justify-between items-center">
                <CardTitle>Question {currentQuestionIndex + 1} of {quiz.questions.length}</CardTitle>
                <span className="text-sm font-medium px-2 py-1 rounded-md bg-secondary text-secondary-foreground">
                    {allQuestionTypes.find(qt => qt.id === currentQuestion.type)?.label || currentQuestion.type}
                </span>
            </div>
            <CardDescription className="pt-2 text-base">{currentQuestion.question}</CardDescription>
          </CardHeader>
          <CardContent>
            {currentQuestion.type === 'mcq' && currentQuestion.options && (
              <RadioGroup value={selectedRadioAnswer || ""} onValueChange={setSelectedRadioAnswer} disabled={showFeedback}>
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 rounded-md hover:bg-secondary/50 transition-colors">
                    <RadioGroupItem value={option} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
            {currentQuestion.type === 'trueFalse' && (
              <RadioGroup value={selectedRadioAnswer || ""} onValueChange={setSelectedRadioAnswer} disabled={showFeedback}>
                {(currentQuestion.options || ["True", "False"]).map((option, index) => ( // Fallback if options aren't set by AI
                  <div key={index} className="flex items-center space-x-2 p-2 rounded-md hover:bg-secondary/50 transition-colors">
                    <RadioGroupItem value={option} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
            {currentQuestion.type === 'fillInTheBlanks' && (
              <Input 
                type="text" 
                value={textInputAnswer} 
                onChange={(e) => setTextInputAnswer(e.target.value)} 
                placeholder="Your answer for the blank"
                disabled={showFeedback}
                className="mt-2"
              />
            )}
            {currentQuestion.type === 'shortAnswer' && (
              <Textarea 
                value={textInputAnswer} 
                onChange={(e) => setTextInputAnswer(e.target.value)} 
                placeholder="Your answer..."
                disabled={showFeedback}
                className="mt-2 min-h-[100px]"
                rows={3}
              />
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-4">
            {!showFeedback ? (
              <Button onClick={handleAnswerSubmit} 
                disabled={
                    ((currentQuestion.type === 'mcq' || currentQuestion.type === 'trueFalse') && !selectedRadioAnswer) ||
                    ((currentQuestion.type === 'fillInTheBlanks' || currentQuestion.type === 'shortAnswer') && !textInputAnswer.trim())
                }>
                <Zap className="mr-2 h-4 w-4" /> Submit Answer
              </Button>
            ) : (
              <div className="space-y-4">
                { ( (currentQuestion.type === 'mcq' || currentQuestion.type === 'trueFalse') && selectedRadioAnswer === currentQuestion.answer) ||
                  ( (currentQuestion.type === 'fillInTheBlanks' || currentQuestion.type === 'shortAnswer') && textInputAnswer.trim().toLowerCase() === currentQuestion.answer.toLowerCase() )? (
                  <div className="flex items-center p-3 rounded-md bg-green-500/10 text-green-400 border border-green-500/30">
                    <CheckCircle2 className="mr-2 h-5 w-5" /> Correct!
                  </div>
                ) : (
                  <div className="flex flex-col p-3 rounded-md bg-red-500/10 text-red-400 border border-red-500/30">
                    <div className="flex items-center"><AlertCircle className="mr-2 h-5 w-5" /> Incorrect.</div>
                    <span className="text-sm mt-1">Correct answer: {currentQuestion.answer}</span>
                  </div>
                )}
                {currentQuestionIndex < quiz.questions.length - 1 ? (
                  <Button onClick={handleNextQuestion} className="w-full">Next Question</Button>
                ) : null}
              </div>
            )}
             {isQuizActive && !showFeedback && quiz && currentQuestionIndex < quiz.questions.length && ( // Show End Test button throughout the quiz if active and not on feedback
                <Button onClick={handleEndTestEarly} variant="outline" className="w-full mt-2">
                    <StopCircle className="mr-2 h-4 w-4" /> End Test Early
                </Button>
            )}
             {showFeedback && currentQuestionIndex === quiz.questions.length -1 && ( // Show Finish & View Score button on the last question's feedback
                 <Button onClick={() => { resetQuizState(true); }} className="w-full mt-4">
                    <ListChecks className="mr-2 h-4 w-4" /> Finish & View Score
                </Button>
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
            <div className="mt-4 space-y-2 sm:space-y-0 sm:space-x-2 flex flex-col sm:flex-row justify-center">
                <Button onClick={() => { resetQuizState(true); }} className="w-full sm:w-auto">
                    <ShieldQuestion className="mr-2 h-4 w-4" /> Try Another Quiz
                </Button>
                <Link href="/reflection" className="w-full sm:w-auto">
                    <Button variant="outline" className="w-full">View Reflections</Button>
                </Link>
            </div>
          </Card>
      )}
    </div>
  );
}


    
