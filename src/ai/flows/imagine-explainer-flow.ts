
'use server';
console.log("Loading AI Flow: imagine-explainer-flow.ts");

/**
 * @fileOverview Provides simple, imaginative explanations for complex topics
 * and initiates a video generation job using RunwayML.
 *
 * - imagineExplainer - A function that generates a simple explanation and starts a video generation task.
 * - ImagineExplainerInput - The input type for the imagineExplainer function.
 * - ImagineExplainerOutput - The return type for the imagineExplainer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { gemini15Flash } from '@genkit-ai/googleai';

// RunwayML API Configuration - PLEASE MOVE API KEY TO ENVIRONMENT VARIABLES
const RUNWAYML_API_URL = 'https://api.runwayml.com/v1/tasks'; // This is a hypothetical endpoint, replace with actual
const RUNWAYML_API_KEY = 'key_9e6bd9b32fb076aa58e6bf3a80cdc26fa45d83e65a29cbdda5609b38c1672a5b5d9c143376c15e87b53f626c4261a610ac4a4aaf3437fe1ab4f5bd3b27bb3fbd'; // User-provided API key

const ImagineExplainerInputSchema = z.object({
  topic: z.string().describe('The complex topic to be explained simply and used for the video.'),
});
export type ImagineExplainerInput = z.infer<typeof ImagineExplainerInputSchema>;

// Schema for the AI-generated text explanation part
const TextExplanationSchema = z.object({
  explanation: z.string().describe('A simple, imaginative explanation of the topic.'),
});

// Schema for the RunwayML API response (simplified for this example)
const RunwayMLJobInfoSchema = z.object({
  task_id: z.string().optional().describe('The ID of the video generation task submitted to RunwayML.'),
  status: z.string().optional().describe('The initial status of the video generation task (e.g., "processing", "queued").'),
  output_url: z.string().optional().describe('URL to the generated video if available immediately (unlikely for initial response).'),
  error: z.string().nullable().optional().describe('Captures error messages from RunwayML.'),
  // Use passthrough to allow any other fields RunwayML might return
}).passthrough();


const ImagineExplainerOutputSchema = z.object({
  explanation: z.string().describe('The AI-generated simple, imaginative explanation of the topic.'),
  videoRenderJob: RunwayMLJobInfoSchema.nullable().describe('The response from the RunwayML API regarding the video generation task, or null if API call failed before response.'),
});
export type ImagineExplainerOutput = z.infer<typeof ImagineExplainerOutputSchema>;

export async function imagineExplainer(input: ImagineExplainerInput): Promise<ImagineExplainerOutput> {
  return imagineExplainerFlow(input);
}

// AI Prompt for generating the text explanation
const explanationPrompt = ai.definePrompt({
  name: 'imagineExplainerTextPrompt',
  model: gemini15Flash,
  input: {schema: ImagineExplainerInputSchema},
  output: {schema: TextExplanationSchema}, // AI generates text explanation
  prompt: `You are 'Imagine Explainer', an AI that explains complex topics in a super simple, imaginative, and friendly way, as if explaining to a curious child or someone with no prior knowledge. Make it engaging and easy to visualize. This explanation will be used as a prompt for an AI video generator.

Topic: {{{topic}}}

Please provide a simple explanation for the topic: "{{{topic}}}". This will be the main text prompt for the video.
Keep the explanation concise, ideally 1-3 short paragraphs.

Example of expected output format:
{
  "explanation": "Imagine black holes are like super-duper hungry vacuum cleaners in space, but way, way stronger! They suck in everything, even light, and nothing can escape once it gets too close. They're so strong because a whole lot of stuff is squeezed into a tiny, tiny spot."
}
Ensure your response strictly follows this JSON format.
`,
});

const imagineExplainerFlow = ai.defineFlow(
  {
    name: 'imagineExplainerFlow',
    inputSchema: ImagineExplainerInputSchema,
    outputSchema: ImagineExplainerOutputSchema,
  },
  async (input) => {
    let aiExplanation = "Could not generate explanation.";
    let runwayMLResponseData: z.infer<typeof RunwayMLJobInfoSchema> | null = null;

    try {
      // 1. Generate text explanation using AI
      const { output: explanationOutput } = await explanationPrompt(input);
      if (!explanationOutput || typeof explanationOutput.explanation !== 'string') {
        console.error("imagineExplainerFlow: AI prompt returned undefined or malformed output for input:", input, "Output received:", explanationOutput);
        // Fallback explanation is already set as "Could not generate explanation."
      } else {
        aiExplanation = explanationOutput.explanation;
      }

      // 2. Prepare data for RunwayML API
      // This is a simplified payload. RunwayML's actual API might require more parameters like model_id, seed, aspect_ratio, etc.
      const runwayMLPayload = {
        text_prompt: aiExplanation,
        // Add other necessary parameters for RunwayML API, e.g.,
        // model: "gen-2", // Example: specify the model
        // duration_seconds: 10, // Example: specify duration
      };

      // 3. Call RunwayML API
      console.log("Calling RunwayML API with payload:", JSON.stringify(runwayMLPayload, null, 2));
      const response = await fetch(RUNWAYML_API_URL, { // Ensure RUNWAYML_API_URL is the correct endpoint
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RUNWAYML_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(runwayMLPayload)
      });

      let parsedJson;
      try {
        parsedJson = await response.json();
        console.log("RunwayML API raw parsed JSON:", JSON.stringify(parsedJson, null, 2));
      } catch (jsonError) {
        console.error("RunwayML API: Failed to parse JSON response.", jsonError);
        parsedJson = null;
        if (!response.ok) {
            runwayMLResponseData = { 
                error: `HTTP error ${response.status}`, 
                message: response.statusText || "Failed to process video request: Non-JSON error response from RunwayML."
            };
        } else {
             runwayMLResponseData = { 
                error: "Invalid JSON response from RunwayML", 
                message: response.statusText || "Received a non-JSON response from RunwayML despite a success status."
            };
        }
      }

      if (!runwayMLResponseData) {
        if (response.ok) {
          // Assuming successful response is the job info object directly
          if (parsedJson && typeof parsedJson === 'object' && !Array.isArray(parsedJson)) {
            runwayMLResponseData = parsedJson;
          } else {
            console.warn("RunwayML API successful, but response format was unexpected or unparsable:", parsedJson);
            runwayMLResponseData = {
              error: "Unexpected response format from RunwayML after success status.",
              message: parsedJson ? JSON.stringify(parsedJson) : (response.statusText || "Response was not valid JSON or was empty."),
            };
          }
        } else { // !response.ok (HTTP error)
          if (parsedJson && typeof parsedJson === 'object' && parsedJson !== null) {
            runwayMLResponseData = parsedJson;
            if (!runwayMLResponseData.error && !runwayMLResponseData.message) {
              runwayMLResponseData.error = `HTTP ${response.status}: ${response.statusText || 'Unknown RunwayML Error'}`;
              runwayMLResponseData.message = JSON.stringify(parsedJson);
            }
          } else {
            runwayMLResponseData = {
              error: `HTTP error ${response.status}`,
              message: response.statusText || "RunwayML API request failed with non-JSON response.",
            };
          }
        }
      }
      console.log("Processed RunwayML API Data (to be returned):", JSON.stringify(runwayMLResponseData, null, 2));

    } catch (e) { // Catches errors from AI prompt, or network error from fetch, etc.
      console.error("Error in imagineExplainerFlow execution:", e);
      if (!runwayMLResponseData) { 
          runwayMLResponseData = { error: "Flow execution error", message: (e as Error).message };
      } else if (runwayMLResponseData) { 
          const flowErrorMessage = `Flow error: ${(e as Error).message}`;
          runwayMLResponseData.error = runwayMLResponseData.error ? `${runwayMLResponseData.error}; ${flowErrorMessage}` : flowErrorMessage;
          if (!runwayMLResponseData.message) runwayMLResponseData.message = "";
      }
    }
    
    return {
      explanation: aiExplanation,
      videoRenderJob: runwayMLResponseData,
    };
  }
);
