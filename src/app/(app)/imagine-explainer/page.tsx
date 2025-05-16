
"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { imagineExplainer, type ImagineExplainerOutput } from "@/ai/flows/imagine-explainer-flow";
import { Loader2, Sparkles, Shapes, Film, AlertTriangle, Info, WifiOff, KeyRound } from "lucide-react"; 

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
      const isApiVersionError = /invalid api version/i.test(errorMessage.toLowerCase()); 
      const isApiKeyError = /API_KEY not configured/i.test(errorMessage.toLowerCase()) || /API key not valid/i.test(errorMessage.toLowerCase()) || /api key required/i.test(errorMessage.toLowerCase()) || /key missing/i.test(errorMessage.toLowerCase()) || /authentication failed/i.test(errorMessage.toLowerCase());
      const isFetchFailedError = /fetch failed/i.test(errorMessage.toLowerCase()) || /could not connect/i.test(errorMessage.toLowerCase());


      if (videoJob && (videoJob.error || (videoJob.status && videoJob.status.toLowerCase().includes('fail')) || isApiKeyError || isFetchFailedError || isApiVersionError)) {
        let toastTitle = "Video Generation Task Issue (Magic Hour)";
        let toastDescription = `Explanation generated. Magic Hour task has an issue: ${errorMessage || 'Unknown video error'}. Task/Video ID: ${videoJob.id || 'N/A'}.`;

        if (isApiKeyError) {
            toastTitle = "Magic Hour API Key Error";
            toastDescription = `There's an issue with the Magic Hour API key: ${errorMessage}. Please ensure MAGICHOUR_API_KEY is correctly set in your server's environment variables and is valid.`;
        } else if (isFetchFailedError) {
            toastTitle = "Magic Hour API Connection Error";
            toastDescription = `Failed to connect to Magic Hour API: ${errorMessage}. Please verify the API endpoint URL in the flow and ensure the server has network access to it.`;
        } else if (isApiVersionError) {
            toastTitle = "Magic Hour API Version Error";
            toastDescription = `Magic Hour API Error: ${errorMessage}. This often indicates an API version mismatch or incorrect endpoint. Please consult the official Magic Hour API documentation.`;
        }
        
        toast({
            title: toastTitle,
            description: toastDescription,
            variant: "destructive",
            duration: 12000,
        });
      } else if (videoJob && (videoJob.id || videoJob.video_url)) { 
         toast({
            title: "Explanation Ready & Video Task Submitted (Magic Hour)!",
            description: `The Imagine Explainer worked its magic. Video generation task submitted to Magic Hour (Task/Video ID: ${videoJob.id || 'N/A'}, Status: ${videoJob.status || 'Submitted'}). This may take some time. Check Magic Hour for progress.`,
            duration: 10000,
        });
      } else if (explanationResult.explanation && !isApiKeyError && !isFetchFailedError) {
         toast({
            title: "Explanation Ready!",
            description: "The Imagine Explainer generated an explanation. Video generation task with Magic Hour could not be reliably initiated or status is unknown. Check Magic Hour info below.",
            variant: "default",
            duration: 7000,
         });
      } else { // Fallback for other unexpected errors
        const errorDetails = videoJob?.error || videoJob?.message || explanationResult.explanation || 'No specific details from video service or explanation generation.';
        let toastDescription = `Could not generate a full explanation or reliably start video generation with Magic Hour. Details: ${errorDetails}`;
        if (isApiKeyError) {
           toastDescription += " Please ensure your MAGICHOUR_API_KEY is correctly set in your server's environment variables and is valid.";
        } else if (isFetchFailedError) {
            toastDescription += " The server could not connect to the Magic Hour API. Please verify the API endpoint URL and ensure the server has network access to it.";
        }
        toast({
            title: "Operation Incomplete (Magic Hour)",
            description: toastDescription,
            variant: "destructive",
            duration: 12000,
        });
      }
    } catch (error) {
      console.error("Imagine Explainer page error (Magic Hour):", error);
      let toastDescription = (error as Error).message || "An unexpected error occurred while trying to get an explanation or start video creation with Magic Hour.";
      if ( /fetch failed/i.test(toastDescription.toLowerCase()) || /could not connect/i.test(toastDescription.toLowerCase())) {
         toastDescription += " This often means the server could not reach the Magic Hour API. Check the API endpoint URL and server network connectivity.";
      } else if (/API_KEY not configured/i.test(toastDescription)) {
          toastDescription = "Magic Hour API Key is not configured on the server. Please contact support or check server environment variables."
      }
      toast({
        title: "Operation Failed (Magic Hour)",
        description: toastDescription,
        variant: "destructive",
        duration: 12000,
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
            <Shapes className="mr-3 h-7 w-7 text-primary" /> Imagine Explainer & Video Creator (via Magic Hour)
          </CardTitle>
          <CardDescription className="space-y-1">
            Get a simple AI explanation for a complex topic, and initiate a text-to-video generation task using the Magic Hour API!
            <br />
            <span className="text-xs text-muted-foreground">
                Video generation uses the Magic Hour API. This page only initiates the task; it doesn't poll for completion. Check Magic Hour with the Task/Video ID.
                The AI-generated text explanation will be used as the script for video generation.
                <strong className="block mt-1">You MUST consult the official Magic Hour API documentation for correct endpoints, payload structure, and any required API version headers.</strong>
            </span>
             <span className="text-xs text-destructive/80 block mt-1">
                <Info className="inline-block h-3 w-3 mr-1" /> Important: Ensure `MAGICHOUR_API_KEY` is set in your server's environment variables (e.g., `.env.local`) and `MAGICHOUR_API_URL` (if overriding placeholder) are correct for this feature to work.
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
            <Button type="submit" disabled={isLoading || !topic.trim()} className="w-full sm:w-auto transition-all duration-100 ease-in-out hover:scale-[1.03] active:scale-[0.98] active:brightness-95 touch-manipulation">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Sparkles className="mr-2 h-4 w-4" /> Explain & Create Video (Magic Hour)!
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card className="bg-secondary/30">
          <CardHeader>
            <CardTitle className="flex items-center">
                <Sparkles className="mr-2 h-5 w-5 text-accent" /> AI Explanation & Magic Hour Video Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">AI Explanation for "{topic || 'your topic'}" (used as video script):</h3>
              <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-background rounded-md shadow">
                <p className="whitespace-pre-wrap text-sm">{result.explanation}</p>
              </div>
            </div>
            
            {result.videoRenderJob && (
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <Film className="mr-2 h-5 w-5 text-primary" /> Video Generation Task (Magic Hour):
                </h3>
                {(result.videoRenderJob.error || (result.videoRenderJob.status && result.videoRenderJob.status.toLowerCase().includes('fail')) ) ? (
                    <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-md">
                        <h4 className="font-semibold text-destructive flex items-center">
                            <AlertTriangle className="mr-2 h-5 w-5" /> Error/Issue with Magic Hour Video Generation Task:
                        </h4>
                        <p className="text-sm text-destructive/90"><strong>Task/Video ID:</strong> {result.videoRenderJob.id || "N/A"}</p>
                        <p className="text-sm text-destructive/90"><strong>Status:</strong> {result.videoRenderJob.status || "Unknown"}</p>
                        <p className="text-sm text-destructive/90 break-words"><strong>Details:</strong> {result.videoRenderJob.message || result.videoRenderJob.error || "An issue occurred with the video generation task."}</p>
                         { (result.videoRenderJob.error || result.videoRenderJob.message || "").toLowerCase().includes("api_key") && 
                           <p className="text-xs text-destructive mt-2 flex items-center"><KeyRound className="h-4 w-4 mr-1"/>Please ensure the `MAGICHOUR_API_KEY` is correctly set in your server's environment variables and is valid.</p>
                        }
                        { /invalid api version/i.test((result.videoRenderJob.message || result.videoRenderJob.error || "").toLowerCase()) &&
                            <p className="text-xs text-destructive mt-1">This error often indicates an API version mismatch or incorrect endpoint. Please consult the official Magic Hour API documentation for the correct API versioning, endpoint, and payload structure for your desired task.</p>
                        }
                        { (/fetch failed/i.test((result.videoRenderJob.message || result.videoRenderJob.error || "").toLowerCase()) || /could not connect/i.test((result.videoRenderJob.message || result.videoRenderJob.error || "").toLowerCase())) &&
                            <p className="text-xs text-destructive mt-1 flex items-center"><WifiOff className="h-4 w-4 mr-1"/>The server could not connect to the Magic Hour API. Please verify the API endpoint URL (attempted: <code className="text-xs bg-destructive/20 p-0.5 rounded">{result.videoRenderJob.message?.split('Attempted URL: ')?.[1]?.split('.')[0] || 'configured URL'}</code>) and ensure the server has network access. Also, check if `MAGICHOUR_API_URL` environment variable is correctly set if you are not using the placeholder.</p>
                        }
                    </div>
                ) : (
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-md space-y-1">
                        <p className="text-sm"><strong className="font-medium">Task/Video ID:</strong> {result.videoRenderJob.id || "Not available"}</p>
                        <p className="text-sm"><strong className="font-medium">Status:</strong> {result.videoRenderJob.status || "Submitted/Processing"}</p>
                        {result.videoRenderJob.video_url && (
                             <p className="text-sm"><strong className="font-medium">Video URL (if ready):</strong> <a href={result.videoRenderJob.video_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary break-all">{result.videoRenderJob.video_url}</a></p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                            Note: Video generation is initiated with Magic Hour and may take some time. This page does not auto-refresh video status. You might need to check your Magic Hour dashboard or API using the Task/Video ID for progress and the final video.
                            Consult Magic Hour documentation for details on specific models, parameters, and how to retrieve final video assets.
                        </p>
                    </div>
                )}
              </div>
            )}
             {!result.videoRenderJob && result.explanation && !(/API_KEY not configured/i.test(result.explanation)) && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
                    <h4 className="font-semibold text-yellow-700 dark:text-yellow-400 flex items-center">
                        <AlertTriangle className="mr-2 h-5 w-5" /> Magic Hour Video Generation Not Started or Failed Early
                    </h4>
                    <p className="text-sm text-yellow-700/90 dark:text-yellow-500/90">The video generation task with Magic Hour could not be initiated or an error occurred before receiving details. Please check server logs and Magic Hour API documentation/settings.</p>
                </div>
            )}
            {result.explanation && /API_KEY not configured/i.test(result.explanation) && (
                 <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-md">
                    <h4 className="font-semibold text-destructive flex items-center">
                        <KeyRound className="mr-2 h-5 w-5" /> Magic Hour API Key Not Configured
                    </h4>
                    <p className="text-sm text-destructive/90">{result.explanation}</p>
                </div>
            )}
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground">
              The explanation is AI-generated. Video generation is handled by Magic Hour.
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

