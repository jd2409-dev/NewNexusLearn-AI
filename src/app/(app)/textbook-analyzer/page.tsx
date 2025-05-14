
"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { analyzeTextbookData, type AnalyzeTextbookDataOutput } from "@/ai/flows/analyze-textbook-data";
import { generateStudySummary, type GenerateStudySummaryOutput } from "@/ai/flows/generate-study-summary";
import { fileToDataUri } from "@/lib/file-utils";
import { Loader2, ScanSearch, FileText } from "lucide-react";

export default function TextbookAnalyzerPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [question, setQuestion] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<AnalyzeTextbookDataOutput | null>(null);
  const [summaryResult, setSummaryResult] = useState<GenerateStudySummaryOutput | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const { toast } = useToast();

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
      } catch (error) {
        toast({
          title: "Error Reading File",
          description: "Could not read the PDF file.",
          variant: "destructive",
        });
      }
    }
  };

  const handleAnalyze = async (e: FormEvent) => {
    e.preventDefault();
    if (!pdfDataUri || !question) {
      toast({
        title: "Missing Information",
        description: "Please upload a PDF and enter a question.",
        variant: "destructive",
      });
      return;
    }
    setIsLoadingAnalysis(true);
    setAnalysisResult(null);
    try {
      const result = await analyzeTextbookData({ pdfDataUri, question });
      setAnalysisResult(result);
      toast({
        title: "Analysis Complete",
        description: "Found answer in the textbook.",
      });
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: (error as Error).message || "Could not analyze the textbook.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!pdfDataUri) {
      toast({
        title: "Missing PDF",
        description: "Please upload a PDF to generate a summary.",
        variant: "destructive",
      });
      return;
    }
    setIsLoadingSummary(true);
    setSummaryResult(null);
    try {
      const result = await generateStudySummary({ pdfDataUri });
      setSummaryResult(result);
      toast({
        title: "Summary Generated",
        description: "Revision notes created successfully.",
      });
    } catch (error) {
      console.error("Summary generation error:", error);
      toast({
        title: "Summary Generation Failed",
        description: (error as Error).message || "Could not generate summary.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSummary(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Textbook Analyzer & Summarizer</CardTitle>
          <CardDescription>
            Upload a textbook PDF to find direct answers to your questions or generate concise study summaries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="pdf-upload">Upload Textbook (PDF)</Label>
            <Input id="pdf-upload" type="file" accept=".pdf" onChange={handleFileChange} className="mt-1" />
            {pdfFile && <p className="text-sm text-muted-foreground mt-2">Selected: {pdfFile.name}</p>}
          </div>

          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <Label htmlFor="question">Ask a Question</Label>
              <Textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g., What is mitosis?"
                className="mt-1"
                rows={3}
              />
            </div>
            <Button type="submit" disabled={isLoadingAnalysis || !pdfDataUri || !question} className="w-full sm:w-auto">
              {isLoadingAnalysis && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <ScanSearch className="mr-2 h-4 w-4" /> Find Answer
            </Button>
          </form>

          {analysisResult && (
            <Card className="bg-secondary/50">
              <CardHeader>
                <CardTitle>Analysis Result</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <h3 className="font-semibold">Answer:</h3>
                <p className="text-muted-foreground">{analysisResult.answer}</p>
                <h3 className="font-semibold mt-2">Page References:</h3>
                <p className="text-muted-foreground">{analysisResult.pageReferences}</p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Smart Study Tools</CardTitle>
            <CardDescription>Generate various study aids from your uploaded PDF.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Button onClick={handleGenerateSummary} disabled={isLoadingSummary || !pdfDataUri} className="w-full md:w-auto">
              {isLoadingSummary && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <FileText className="mr-2 h-4 w-4" /> Generate Text Summary
            </Button>
            {summaryResult && (
                <Card className="bg-secondary/50 mt-4">
                <CardHeader>
                    <CardTitle>Revision Notes</CardTitle>
                </CardHeader>
                <CardContent>
                    <pre className="whitespace-pre-wrap text-sm text-muted-foreground p-4 bg-background rounded-md overflow-x-auto">
                    {summaryResult.summary}
                    </pre>
                </CardContent>
                </Card>
            )}
        </CardContent>
         <CardFooter>
            <p className="text-xs text-muted-foreground">
                Text summaries are generated based on the content of your PDF.
            </p>
          </CardFooter>
      </Card>
    </div>
  );
}
