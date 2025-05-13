
"use client";

import { useState, type FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { generateInteractiveQuiz, type GenerateInteractiveQuizOutput } from "@/ai/flows/generate-interactive-quiz";
import { fileToDataUri } from "@/lib/file-utils";
import { Loader2, FilePlus, Zap, AlertCircle, CheckCircle2, Clock } from "lucide-react";
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
        setQuiz(null); // Reset quiz if new file is uploaded
        setUserAnswers([]);
      } catch (error) {
        toast({
          title: "Error Reading File",
          description: "Could not read the PDF file.",
          variant: "destructive",
        });
      }
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

    setIsLoading(true);
    setQuiz(null);
    setCurrentQuestionIndex(0);
    setScore(0);
    setShowFeedback(false);
    setUserAnswers([]);

    try {
      const result = await generateInteractiveQuiz({ pdfDataUri, numberOfQuestions });
      if (result.questions && result.questions.length > 0) {
        setQuiz(result);
        setUserAnswers(new Array(result.questions.length).fill("")); // Initialize userAnswers
        toast({
          title: "Quiz Generated",
          description: `Successfully created a ${result.questions.length}-question quiz.`,
        });
      } else {
        toast({
          title: "Quiz Generation Failed",
          description: "AI could not generate questions from this PDF. Try another one.",
          variant: "destructive",
        });
      }
    } catch (error) {
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
  };

  const saveQuizResults = async () => {
    if (!user || !quiz || !pdfFile) return;

    const questionsDetails: PastQuizQuestionDetail[] = quiz.questions.map((q, index) => ({
        questionText: q.question,
        userAnswer: userAnswers[index] || "Not answered", // Ensure there's a value
        correctAnswer: q.answer,
        options: q.options,
        isCorrect: userAnswers[index] === q.answer,
    }));

    const pastQuizData: PastQuiz = {
        id: `${new Date().toISOString()}-${Math.random().toString(36).substring(2, 9)}`, // Unique ID
        quizName: pdfFile.name.replace('.pdf', '') || "Untitled Quiz",
        dateAttempted: Timestamp.now(),
        score: score,
        totalQuestions: quiz.questions.length,
        questions: questionsDetails,
    };

    try {
        await addPastQuiz(user.uid, pastQuizData);
        await refreshUserProfile(); // Refresh profile to include the new quiz
        toast({
            title: "Quiz Saved",
            description: "Your quiz results have been saved to your reflections.",
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
      // This was the last question, save results
      await saveQuizResults();
    }
    setCurrentQuestionIndex(currentQuestionIndex + 1);
  };

  const currentQuestion: QuizQuestion | undefined = quiz?.questions[currentQuestionIndex];

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
            <div className="flex flex-col sm:flex-row gap-4">
                <Button type="submit" disabled={isLoading || !pdfDataUri} className="flex-1">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <FilePlus className="mr-2 h-4 w-4" /> Generate Quiz
                </Button>
                <Button variant="outline" disabled className="flex-1"> {/* Placeholder for Timed Exam Mode */}
                    <Clock className="mr-2 h-4 w-4" /> Timed Exam Mode (Soon)
                </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {quiz && currentQuestion && (
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
                  <Card className="bg-secondary/50 text-center p-6">
                    <CardTitle className="text-xl mb-2">Quiz Complete!</CardTitle>
                    <CardDescription className="text-lg">Your score: {score} out of {quiz.questions.length}</CardDescription>
                    <Button onClick={async () => { 
                        if (showFeedback) { // Ensure saveQuizResults is called if it's the last question and feedback is shown
                           await saveQuizResults();
                        }
                        setQuiz(null); 
                        setCurrentQuestionIndex(0); 
                        setScore(0); 
                        setUserAnswers([]);
                        setShowFeedback(false);
                        setSelectedAnswer(null);
                    }} className="mt-4">
                      Try Another Quiz
                    </Button>
                  </Card>
                )}
              </div>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
