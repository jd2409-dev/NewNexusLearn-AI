
"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { imagineExplainer, type ImagineExplainerOutput } from "@/ai/flows/imagine-explainer-flow";
import { Loader2, Sparkles, Shapes, Film, AlertTriangle, Info } from "lucide-react"; 

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
        description: "Please enter a topic to explain and generate a video for.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);
    try {
      const explanationResult = await imagineExplainer({ topic });
      setResult(explanationResult);

      const videoJob = explanationResult.videoRenderJob;
      const errorMessage = videoJob?.message || videoJob?.error || "";
      const isApiVersionError = /invalid api version/i.test(errorMessage.toLowerCase()); // Keep this for generic API errors

      if (videoJob && (videoJob.error || videoJob.status === 'failed' || videoJob.status === 'error')) {
        toast({
            title: "Video Generation Task Issue (Minimax)",
            description: `Explanation generated. Minimax task has an issue: ${errorMessage || 'Unknown video error'}. Task ID: ${videoJob.taskId || 'N/A'}.${isApiVersionError ? " Please check Minimax API documentation for correct API versioning/endpoints." : ""}`,
            variant: "destructive",
            duration: 10000,
        });
      } else if (videoJob && (videoJob.taskId || videoJob.videoUrl)) { // Check for taskId or direct videoUrl
         toast({
            title: "Explanation Ready & Video Task Submitted (Minimax)!",
            description: `The Imagine Explainer worked its magic. Video generation task submitted to Minimax (Task ID: ${videoJob.taskId || 'N/A'}, Status: ${videoJob.status || 'Submitted'}). This may take some time. Check Minimax for progress.`,
            duration: 10000,
        });
      } else if (explanationResult.explanation && !explanationResult.explanation.startsWith("MINIMAX_API_KEY not configured")) {
         toast({
            title: "Explanation Ready!",
            description: "The Imagine Explainer generated an explanation. Video generation task with Minimax could not be reliably initiated or status is unknown. Check Minimax info below.",
            variant: "default",
            duration: 7000,
         });
      } else {
        const errorDetails = videoJob?.error || videoJob?.message || explanationResult.explanation || 'No specific details from video service or explanation generation.';
        toast({
            title: "Operation Incomplete (Minimax)",
            description: `Could not generate a full explanation or reliably start video generation with Minimax. Details: ${errorDetails}`,
            variant: "destructive",
            duration: 10000,
        });
      }
    } catch (error) {
      console.error("Imagine Explainer page error (Minimax):", error);
      toast({
        title: "Operation Failed (Minimax)",
        description: (error as Error).message || "An unexpected error occurred while trying to get an explanation or start video creation with Minimax.",
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
            <Shapes className="mr-3 h-7 w-7 text-primary" /> Imagine Explainer & Video Creator (via Minimax)
          </CardTitle>
          <CardDescription className="space-y-1">
            Get a simple AI explanation for a complex topic, and initiate a text-to-video generation task using Minimax API!
            <br />
            <span className="text-xs text-muted-foreground">
                Video generation uses the Minimax API. This page only initiates the task; it doesn't poll for completion. Check Minimax with the Task ID.
                The AI-generated text explanation will be used as the prompt for video generation.
                <strong className="block mt-1">You MUST consult the official Minimax API documentation for correct endpoints, payload structure (e.g., model IDs), and any required API version headers.</strong>
            </span>
             <span className="text-xs text-destructive/80 block mt-1">
                <Info className="inline-block h-3 w-3 mr-1" /> Important: Ensure `MINIMAX_API_KEY` is set in your server's environment variables (e.g., `.env.local`) for this feature to work securely and correctly.
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
                <Sparkles className="mr-2 h-5 w-5 text-accent" /> AI Explanation & Minimax Video Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">AI Explanation for "{topic || 'your topic'}" (used as video prompt):</h3>
              <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-background rounded-md shadow">
                <p className="whitespace-pre-wrap text-sm">{result.explanation}</p>
              </div>
            </div>
            
            {result.videoRenderJob && (
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <Film className="mr-2 h-5 w-5 text-primary" /> Video Generation Task (Minimax):
                </h3>
                {result.videoRenderJob.error || result.videoRenderJob.status === 'failed' || result.videoRenderJob.status === 'error' ? (
                    <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-md">
                        <h4 className="font-semibold text-destructive flex items-center">
                            <AlertTriangle className="mr-2 h-5 w-5" /> Error/Issue with Video Generation Task:
                        </h4>
                        <p className="text-sm text-destructive/90"><strong>Task ID:</strong> {result.videoRenderJob.taskId || "N/A"}</p>
                        <p className="text-sm text-destructive/90"><strong>Status:</strong> {result.videoRenderJob.status || "Unknown"}</p>
                        <p className="text-sm text-destructive/90"><strong>Details:</strong> {result.videoRenderJob.message || result.videoRenderJob.error || "An issue occurred with the video generation task."}</p>
                         { (result.videoRenderJob.error || "").includes("API Key not configured") && 
                           <p className="text-xs text-destructive mt-2">Please ensure the `MINIMAX_API_KEY` is correctly set in your server's environment variables.</p>
                        }
                        { /invalid api version/i.test((result.videoRenderJob.message || result.videoRenderJob.error || "").toLowerCase()) &&
                            <p className="text-xs text-destructive mt-1">This error often indicates an API version mismatch or incorrect endpoint. Please consult the official Minimax API documentation for the correct API versioning, endpoint, and payload structure for your desired task.</p>
                        }
                    </div>
                ) : (
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-md space-y-1">
                        <p className="text-sm"><strong className="font-medium">Task ID:</strong> {result.videoRenderJob.taskId || "Not available"}</p>
                        <p className="text-sm"><strong className="font-medium">Status:</strong> {result.videoRenderJob.status || "Submitted/Processing"}</p>
                        {result.videoRenderJob.videoUrl && (
                             <p className="text-sm"><strong className="font-medium">Video URL (if ready):</strong> <a href={result.videoRenderJob.videoUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">{result.videoRenderJob.videoUrl}</a></p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                            Note: Video generation is initiated with Minimax and may take some time. This page does not auto-refresh video status. You might need to check your Minimax dashboard or API using the Task ID for progress and the final video.
                            Consult Minimax documentation for details on specific models, parameters, and how to retrieve final video assets.
                        </p>
                    </div>
                )}
              </div>
            )}
             {!result.videoRenderJob && result.explanation && !result.explanation.startsWith("MINIMAX_API_KEY not configured") && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
                    <h4 className="font-semibold text-yellow-700 dark:text-yellow-400 flex items-center">
                        <AlertTriangle className="mr-2 h-5 w-5" /> Video Generation Not Started or Failed Early
                    </h4>
                    <p className="text-sm text-yellow-700/90 dark:text-yellow-500/90">The video generation task with Minimax could not be initiated or an error occurred before receiving details. Please check server logs for more details if the issue persists.</p>
                </div>
            )}
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground">
              The explanation is AI-generated. Video generation is handled by Minimax.
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
