
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
      if (explanationResult.videoRenderJob && explanationResult.videoRenderJob.error) {
        toast({
            title: "Video Generation Issue",
            description: `Explanation generated, but video rendering failed: ${explanationResult.videoRenderJob.message || explanationResult.videoRenderJob.error}`,
            variant: "destructive",
            duration: 7000,
        });
      } else if (explanationResult.videoRenderJob && explanationResult.videoRenderJob.id) {
         toast({
            title: "Explanation & Video Started!",
            description: `The Imagine Explainer has worked its magic. Video rendering initiated (ID: ${explanationResult.videoRenderJob.id}).`,
            duration: 7000,
        });
      } else {
         toast({
            title: "Explanation Ready!",
            description: "The Imagine Explainer has generated an explanation. Video rendering status unknown or failed.",
            variant: "default",
         });
      }
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
            <Shapes className="mr-3 h-7 w-7 text-primary" /> Imagine Explainer & Video Creator
          </CardTitle>
          <CardDescription>
            Got a complex topic? Let our AI explain it simply and start generating a short video!
            <br />
            <span className="text-xs text-muted-foreground">
                Video generation uses Creatomate API. Please be mindful of API usage and template design.
                The API key is currently hardcoded for demonstration and should be secured via environment variables in production.
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
              <h3 className="text-lg font-semibold mb-1">AI Explanation for "{topic}":</h3>
              <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-background rounded-md shadow">
                <p className="whitespace-pre-wrap text-sm">{result.explanation}</p>
              </div>
            </div>
            
            {result.videoRenderJob && (
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <Film className="mr-2 h-5 w-5 text-primary" /> Video Rendering Information (via Creatomate):
                </h3>
                {result.videoRenderJob.error ? (
                    <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-md">
                        <h4 className="font-semibold text-destructive flex items-center">
                            <AlertTriangle className="mr-2 h-5 w-5" /> Error Starting Video Render:
                        </h4>
                        <p className="text-sm text-destructive/90">{result.videoRenderJob.message || result.videoRenderJob.error}</p>
                    </div>
                ) : (
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-md space-y-1">
                        <p className="text-sm"><strong className="font-medium">Render ID:</strong> {result.videoRenderJob.id || "N/A"}</p>
                        <p className="text-sm"><strong className="font-medium">Status:</strong> {result.videoRenderJob.status || "Unknown"}</p>
                        {result.videoRenderJob.url && (
                             <p className="text-sm"><strong className="font-medium">Video URL (if ready):</strong> <a href={result.videoRenderJob.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">{result.videoRenderJob.url}</a></p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                            Note: Video rendering may take some time. You might need to check the status with Creatomate using the Render ID. This page doesn't auto-refresh video status.
                        </p>
                    </div>
                )}
              </div>
            )}
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground">
              The explanation is AI-generated. Video rendering is handled by Creatomate.
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
