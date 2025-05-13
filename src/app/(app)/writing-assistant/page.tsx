
"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { provideWritingAssistance, type ProvideWritingAssistanceOutput, type ProvideWritingAssistanceInput } from "@/ai/flows/provide-writing-assistance";
import { Loader2, Edit3, Sparkles, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const assistanceTypes: ProvideWritingAssistanceInput['assistanceType'][] = ['overall', 'grammar', 'structure', 'clarity'];

export default function WritingAssistantPage() {
  const [text, setText] = useState<string>("");
  const [assistanceType, setAssistanceType] = useState<ProvideWritingAssistanceInput['assistanceType']>('overall');
  const [feedbackResult, setFeedbackResult] = useState<ProvideWritingAssistanceOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const isPaidPlan = userProfile?.plan === "paid";


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text) {
      toast({
        title: "Missing Text",
        description: "Please enter some text to get assistance.",
        variant: "destructive",
      });
      return;
    }

    if (!isPaidPlan) {
      toast({
        title: "Paid Plan Feature",
        description: "The Writing Assistant is a premium feature. Please upgrade your plan to use it.",
        variant: "default"
      });
      return;
    }

    setIsLoading(true);
    setFeedbackResult(null);
    try {
      const result = await provideWritingAssistance({ text, assistanceType });
      setFeedbackResult(result);
      toast({
        title: "Feedback Ready!",
        description: "AI Writing Assistant has provided feedback.",
      });
    } catch (error) {
      console.error("Writing assistance error:", error);
      toast({
        title: "Assistance Failed",
        description: (error as Error).message || "Could not get writing assistance.",
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
            <Edit3 className="mr-3 h-7 w-7 text-primary" /> AI Writing Assistant
          </CardTitle>
          <CardDescription>
            Get AI-powered feedback on your essays, reports, and other written work.
            { !isPaidPlan && " This is a premium feature available on the Paid Plan."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="writing-text">Your Text:</Label>
              <Textarea
                id="writing-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your essay, report, or any text here..."
                className="mt-1 min-h-[200px]"
                rows={10}
                disabled={!isPaidPlan || isLoading}
              />
            </div>
            <div>
              <Label htmlFor="assistance-type">Type of Assistance:</Label>
              <Select value={assistanceType} onValueChange={(value) => setAssistanceType(value as ProvideWritingAssistanceInput['assistanceType'])} disabled={!isPaidPlan || isLoading}>
                <SelectTrigger id="assistance-type" className="mt-1">
                  <SelectValue placeholder="Select assistance type" />
                </SelectTrigger>
                <SelectContent>
                  {assistanceTypes.map((type) => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isLoading || !text || !isPaidPlan} className="w-full sm:w-auto">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Sparkles className="mr-2 h-4 w-4" /> Get Feedback
            </Button>
             {!isPaidPlan && (
              <p className="text-sm text-destructive mt-2">
                Upgrade to the Paid Plan to use the AI Writing Assistant.
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {feedbackResult && isPaidPlan && (
        <Card className="bg-secondary/30">
          <CardHeader>
            <CardTitle className="flex items-center">
                <Sparkles className="mr-2 h-5 w-5 text-accent" /> AI Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Overall Feedback:</h3>
              <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-background rounded-md shadow">
                <p className="whitespace-pre-wrap text-sm">{feedbackResult.feedback}</p>
              </div>
            </div>
            {feedbackResult.suggestions && feedbackResult.suggestions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Suggestions:</h3>
                <ul className="space-y-2">
                  {feedbackResult.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start p-3 bg-background rounded-md shadow">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 shrink-0" />
                      <span className="text-sm">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground">
              This feedback is AI-generated. Use it to improve your writing but always use your best judgment.
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
