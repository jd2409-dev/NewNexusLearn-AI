"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { provideAiStudyCoaching, type ProvideAiStudyCoachingOutput } from "@/ai/flows/provide-ai-study-coaching";
import { Loader2, MessageSquareHeart, Sparkles } from "lucide-react";

const studentLevels = ["CBSE", "ICSE", "GCSE", "IB", "State Board - General", "High School", "Middle School", "University"];

export default function AiCoachPage() {
  const [problem, setProblem] = useState<string>("");
  const [studentLevel, setStudentLevel] = useState<string>("");
  const [explanation, setExplanation] = useState<ProvideAiStudyCoachingOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!problem || !studentLevel) {
      toast({
        title: "Missing Information",
        description: "Please enter your problem and select your academic level.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setExplanation(null);
    try {
      const result = await provideAiStudyCoaching({ problem, studentLevel });
      setExplanation(result);
      toast({
        title: "Explanation Ready!",
        description: "AI Coach has provided a step-by-step guide.",
      });
    } catch (error) {
      console.error("AI Coaching error:", error);
      toast({
        title: "Coaching Failed",
        description: (error as Error).message || "Could not get help from AI Coach.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <MessageSquareHeart className="mr-3 h-7 w-7 text-primary" /> AI Study Coach
          </CardTitle>
          <CardDescription>
            Stuck on a problem? Describe it below, select your academic level, and our AI Coach will provide a step-by-step explanation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="problem-description">Describe your problem or question:</Label>
              <Textarea
                id="problem-description"
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="e.g., I don't understand how to solve quadratic equations by factoring."
                className="mt-1 min-h-[120px]"
                rows={5}
              />
            </div>
            <div>
              <Label htmlFor="student-level">Your Academic Level:</Label>
              <Select value={studentLevel} onValueChange={setStudentLevel}>
                <SelectTrigger id="student-level" className="mt-1">
                  <SelectValue placeholder="Select your level" />
                </SelectTrigger>
                <SelectContent>
                  {studentLevels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isLoading || !problem || !studentLevel} className="w-full sm:w-auto">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Sparkles className="mr-2 h-4 w-4" /> Get Help from AI Coach
            </Button>
          </form>
        </CardContent>
      </Card>

      {explanation && (
        <Card className="bg-secondary/30">
          <CardHeader>
            <CardTitle className="flex items-center">
                <Sparkles className="mr-2 h-5 w-5 text-accent" /> AI Coach Explanation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-background rounded-md shadow">
              <pre className="whitespace-pre-wrap text-sm">{explanation.explanation}</pre>
            </div>
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground">
              This explanation is AI-generated. Always cross-verify critical information.
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
