"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { generateExamBlueprint, type GenerateExamBlueprintOutput } from "@/ai/flows/generate-exam-blueprint";
import { Loader2, BookOpenText, Route } from "lucide-react";

const boards = ["CBSE", "ICSE", "GCSE", "IB", "State Board - General", "Other"];
const subjects = ["Mathematics", "Science", "Physics", "Chemistry", "Biology", "English", "History", "Geography", "Computer Science"];
const examTypes = ["Final Exam", "Midterm", "Unit Test", "Semester Exam", "Board Exam"];
const difficultyLevels = ["Easy", "Medium", "Hard", "Challenging"];

export default function LearningPathsPage() {
  const [board, setBoard] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [topics, setTopics] = useState<string>("");
  const [examType, setExamType] = useState<string>("");
  const [difficultyLevel, setDifficultyLevel] = useState<string>("");
  const [blueprint, setBlueprint] = useState<GenerateExamBlueprintOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!board || !subject || !topics || !examType || !difficultyLevel) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields to generate a learning path.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setBlueprint(null);
    try {
      const result = await generateExamBlueprint({ board, subject, topics, examType, difficultyLevel });
      setBlueprint(result);
      toast({
        title: "Learning Path Generated!",
        description: "Your personalized exam blueprint is ready.",
      });
    } catch (error) {
      console.error("Learning Path generation error:", error);
      toast({
        title: "Generation Failed",
        description: (error as Error).message || "Could not generate the learning path.",
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
            <BookOpenText className="mr-3 h-7 w-7 text-primary" /> AI-Powered Learning Paths
          </CardTitle>
          <CardDescription>
            Generate a customized exam blueprint or study plan based on your curriculum and goals. Focus on high-weightage topics and optimize your preparation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="board">School Board</Label>
                <Select value={board} onValueChange={setBoard}>
                  <SelectTrigger id="board" className="mt-1">
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    {boards.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger id="subject" className="mt-1">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="topics">Topics (comma-separated)</Label>
              <Textarea
                id="topics"
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                placeholder="e.g., Algebra, Calculus, Geometry"
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="exam-type">Exam Type</Label>
                <Select value={examType} onValueChange={setExamType}>
                  <SelectTrigger id="exam-type" className="mt-1">
                    <SelectValue placeholder="Select exam type" />
                  </SelectTrigger>
                  <SelectContent>
                    {examTypes.map((et) => <SelectItem key={et} value={et}>{et}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select value={difficultyLevel} onValueChange={setDifficultyLevel}>
                  <SelectTrigger id="difficulty" className="mt-1">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyLevels.map((dl) => <SelectItem key={dl} value={dl}>{dl}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Route className="mr-2 h-4 w-4" /> Generate Learning Path
            </Button>
          </form>
        </CardContent>
      </Card>

      {blueprint && (
        <Card className="bg-secondary/30">
          <CardHeader>
            <CardTitle>Your Custom Learning Path / Exam Blueprint</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-background rounded-md shadow">
              <pre className="whitespace-pre-wrap text-sm">{blueprint.blueprint}</pre>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              This plan is AI-generated. Adapt it to your specific needs and consult your teachers for guidance.
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
