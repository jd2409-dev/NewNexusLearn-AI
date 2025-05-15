
"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { imagineExplainer, type ImagineExplainerOutput } from "@/ai/flows/imagine-explainer-flow";
import { Loader2, Sparkles, Shapes } from "lucide-react"; // Shapes icon for "Imagine"

export default function ImagineExplainerPage() {
  const [topic, setTopic] = useState<string>("");
  const [result, setResult] = useState<ImagineExplainerOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast({
        title: "Missing Topic",
        description: "Please enter a topic to explain.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);
    try {
      const explanationResult = await imagineExplainer({ topic });
      setResult(explanationResult);
      toast({
        title: "Explanation Ready!",
        description: "The Imagine Explainer has worked its magic.",
      });
    } catch (error) {
      console.error("Imagine Explainer error:", error);
      toast({
        title: "Explanation Failed",
        description: (error as Error).message || "Could not get an explanation for this topic.",
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
            <Shapes className="mr-3 h-7 w-7 text-primary" /> Imagine Explainer
          </CardTitle>
          <CardDescription>
            Got a complex topic? Let our AI explain it in a super simple and imaginative way!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="topic-input">What topic do you want explained?</Label>
              <Textarea
                id="topic-input"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Quantum Entanglement, The Water Cycle, How a Car Engine Works..."
                className="mt-1 min-h-[100px]"
                rows={3}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" disabled={isLoading || !topic.trim()} className="w-full sm:w-auto transition-all duration-150 ease-in-out hover:scale-[1.03] active:scale-[0.98] touch-manipulation active:brightness-95">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Sparkles className="mr-2 h-4 w-4" /> Explain It!
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card className="bg-secondary/30">
          <CardHeader>
            <CardTitle className="flex items-center">
                <Sparkles className="mr-2 h-5 w-5 text-accent" /> Here's the Simple Explanation!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Explanation for "{topic}":</h3>
              <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-background rounded-md shadow">
                <p className="whitespace-pre-wrap text-sm">{result.explanation}</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Image Suggestion:</h3>
              <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-background rounded-md shadow">
                <p className="whitespace-pre-wrap text-sm">{result.imageSuggestion}</p>
              </div>
            </div>
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground">
              This explanation is AI-generated. Isn't imagination wonderful?
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
