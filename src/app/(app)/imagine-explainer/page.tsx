
"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { imagineExplainer, type ImagineExplainerOutput } from "@/ai/flows/imagine-explainer-flow";
import { Loader2, Sparkles, Shapes, Film, AlertTriangle } from "lucide-react"; 

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

      if (explanationResult.videoRenderJob && (explanationResult.videoRenderJob.error || explanationResult.videoRenderJob.message?.toLowerCase().includes('fail'))) {
        toast({
            title: "Video Generation Issue",
            description: `Explanation generated, but video generation has an issue: ${explanationResult.videoRenderJob.message || explanationResult.videoRenderJob.error || 'Unknown video error'}. Check RunwayML for details.`,
            variant: "destructive",
            duration: 8000,
        });
      } else if (explanationResult.videoRenderJob && (explanationResult.videoRenderJob.task_id || explanationResult.videoRenderJob.status)) {
         toast({
            title: "Explanation & Video Job Started!",
            description: `The Imagine Explainer worked its magic. Video generation task submitted to RunwayML (Task ID: ${explanationResult.videoRenderJob.task_id || 'N/A'}, Status: ${explanationResult.videoRenderJob.status || 'Unknown'}). This may take some time.`,
            duration: 8000,
        });
      } else if (explanationResult.explanation && explanationResult.explanation !== "Could not generate explanation.") {
         toast({
            title: "Explanation Ready!",
            description: "The Imagine Explainer generated an explanation. Video generation status is unknown or encountered an issue before starting.",
            variant: "default",
            duration: 7000,
         });
      } else {
        toast({
            title: "Something Went Wrong",
            description: "Could not generate an explanation or start video generation.",
            variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Imagine Explainer page error:", error);
      toast({
        title: "Operation Failed",
        description: (error as Error).message || "Could not get an explanation or start video creation for this topic.",
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
            <Shapes className="mr-3 h-7 w-7 text-primary" /> Imagine Explainer & Video Creator
          </CardTitle>
          <CardDescription>
            Got a complex topic? Let our AI explain it simply and start generating a short video via RunwayML!
            <br />
            <span className="text-xs text-muted-foreground">
                Video generation uses the RunwayML API. Please ensure your API key is correctly set up and be mindful of API usage limits.
                For production, the API key should be secured via environment variables. This page only initiates the task; it doesn't poll for completion.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="topic-input">What topic do you want explained and made into a video?</Label>
              <Textarea
                id="topic-input"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Photosynthesis, Black Holes, How AI Learns..."
                className="mt-1 min-h-[100px]"
                rows={3}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" disabled={isLoading || !topic.trim()} className="w-full sm:w-auto transition-all duration-150 ease-in-out hover:scale-[1.03] active:scale-[0.98] touch-manipulation active:brightness-95">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Sparkles className="mr-2 h-4 w-4" /> Explain & Create Video!
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card className="bg-secondary/30">
          <CardHeader>
            <CardTitle className="flex items-center">
                <Sparkles className="mr-2 h-5 w-5 text-accent" /> AI Explanation & Video Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">AI Explanation for "{topic || "your topic"}":</h3>
              <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-background rounded-md shadow">
                <p className="whitespace-pre-wrap text-sm">{result.explanation}</p>
              </div>
            </div>
            
            {result.videoRenderJob && (
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <Film className="mr-2 h-5 w-5 text-primary" /> Video Generation Information (via RunwayML):
                </h3>
                {result.videoRenderJob.error || result.videoRenderJob.message?.toLowerCase().includes('fail') ? (
                    <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-md">
                        <h4 className="font-semibold text-destructive flex items-center">
                            <AlertTriangle className="mr-2 h-5 w-5" /> Error with Video Generation Task:
                        </h4>
                        <p className="text-sm text-destructive/90">{result.videoRenderJob.message || result.videoRenderJob.error || "Unknown error occurred with video generation."}</p>
                        {result.videoRenderJob.task_id && <p className="text-xs text-muted-foreground mt-1">Task ID: {result.videoRenderJob.task_id}</p>}
                    </div>
                ) : (
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-md space-y-1">
                        <p className="text-sm"><strong className="font-medium">Task ID:</strong> {result.videoRenderJob.task_id || "N/A"}</p>
                        <p className="text-sm"><strong className="font-medium">Status:</strong> {result.videoRenderJob.status || "Submitted/Processing"}</p>
                        {result.videoRenderJob.output_url && (
                             <p className="text-sm"><strong className="font-medium">Video URL (if ready):</strong> <a href={result.videoRenderJob.output_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">{result.videoRenderJob.output_url}</a></p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                            Note: Video generation is initiated with RunwayML and may take some time. This page does not auto-refresh video status. You might need to check RunwayML using the Task ID.
                        </p>
                    </div>
                )}
              </div>
            )}
             {!result.videoRenderJob && result.explanation !== "Could not generate explanation." && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
                    <h4 className="font-semibold text-yellow-700 dark:text-yellow-400 flex items-center">
                        <AlertTriangle className="mr-2 h-5 w-5" /> Video Generation Not Started
                    </h4>
                    <p className="text-sm text-yellow-700/90 dark:text-yellow-500/90">The video generation task could not be initiated. Please check server logs for more details if the issue persists.</p>
                </div>
            )}
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground">
              The explanation is AI-generated. Video generation is handled by RunwayML.
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

