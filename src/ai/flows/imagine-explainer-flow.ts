
'use server';
console.log("Loading AI Flow: imagine-explainer-flow.ts");

/**
 * @fileOverview Provides simple, imaginative explanations for complex topics
 * and initiates a video generation job using Minimax API.
 *
 * - imagineExplainer - A function that generates a simple explanation and starts a video generation task.
 * - ImagineExplainerInput - The input type for the imagineExplainer function.
 * - ImagineExplainerOutput - The return type for the imagineExplainer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { gemini15Flash } from '@genkit-ai/googleai';

// Minimax API Configuration
// IMPORTANT: You MUST verify this endpoint with Minimax's official API documentation.
const MINIMAX_API_URL = 'https://api.minimax.chat/v1/some_video_endpoint'; // REPLACE WITH ACTUAL MINIMAX ENDPOINT
let MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;

if (!MINIMAX_API_KEY) {
  console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.warn("!!! WARNING: MINIMAX_API_KEY environment variable not set in your .env.local file or deployment environment. !!!");
  console.warn("!!! Video generation will likely fail without a valid API key. !!!");
  console.warn("!!! Please set MINIMAX_API_KEY for proper and secure operation. !!!");
  console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  // No fallback key will be used here. The feature should fail if the key is not set.
}


const ImagineExplainerInputSchema = z.object({
  topic: z.string().describe('The complex topic to be explained simply and used for the video.'),
});
export type ImagineExplainerInput = z.infer<typeof ImagineExplainerInputSchema>;

// Schema for the AI-generated text explanation part
const TextExplanationSchema = z.object({
  explanation: z.string().describe('A simple, imaginative explanation of the topic.'),
});

// Schema for the Minimax API response (task submission)
// This is a VERY GENERIC schema. You MUST adjust it based on Minimax's actual response.
const MinimaxJobInfoSchema = z.object({
  taskId: z.string().optional().describe('The ID of the video generation task submitted to Minimax.'),
  status: z.string().optional().describe('The initial status of the video generation task.'),
  videoUrl: z.string().optional().describe('URL to the generated video if available immediately.'),
  error: z.string().nullable().optional().describe('Captures error messages from Minimax.'),
  message: z.string().nullable().optional().describe('Additional messages from Minimax.'),
  // Add any other fields you expect from Minimax's initial task response
}).passthrough(); // passthrough() allows other fields Minimax might return without schema validation errors.


const ImagineExplainerOutputSchema = z.object({
  explanation: z.string().describe('The AI-generated simple, imaginative explanation of the topic.'),
  videoRenderJob: MinimaxJobInfoSchema.nullable().describe('The response from the Minimax API regarding the video generation task, or null if the API call failed before a structured response was received.'),
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
    let aiExplanation = `Video about: ${input.topic}`; // Fallback prompt if AI explanation fails
    let minimaxResponseData: z.infer<typeof MinimaxJobInfoSchema> | null = null;

    if (!MINIMAX_API_KEY) {
        console.error("imagineExplainerFlow: CRITICAL - MINIMAX_API_KEY is not configured. Video generation will fail.");
        return {
            explanation: "MINIMAX_API_KEY not configured. Please set the MINIMAX_API_KEY environment variable. Cannot generate video explanation.",
            videoRenderJob: { error: "MINIMAX_API_KEY not configured.", message: "Please set the MINIMAX_API_KEY environment variable." },
        };
    }
    console.log("imagineExplainerFlow: Using Minimax API Key from environment variable.");


    try {
      // 1. Generate text explanation using AI
      console.log("imagineExplainerFlow: Generating text explanation for topic:", input.topic);
      const { output: explanationOutput } = await explanationPrompt(input);
      
      if (explanationOutput && typeof explanationOutput.explanation === 'string' && explanationOutput.explanation.trim() !== "") {
        aiExplanation = explanationOutput.explanation;
        console.log("imagineExplainerFlow: AI explanation generated successfully.");
      } else {
        console.warn("imagineExplainerFlow: AI prompt returned undefined, malformed, or empty output for input:", input, "Output received:", explanationOutput, "Using fallback prompt for video.");
        // aiExplanation is already set to fallback
      }

      // 2. Prepare data for Minimax API
      // IMPORTANT: This is a GENERIC payload. You MUST consult Minimax's API documentation
      // for the specific model and parameters required for text-to-video or desired task.
      const minimaxPayload = {
        prompt: aiExplanation, // This is a guess, Minimax might call it 'text_input', 'description', etc.
        topic: input.topic,     // You might need to send the original topic as well
        // model: "minimax_video_model_xyz", // Example: You'll likely need to specify a model
        // duration: 5, // Example: Desired video duration in seconds
        // aspect_ratio: "16:9", // Example
        // ... other Minimax specific parameters
      };

      // 3. Call Minimax API
      console.log("imagineExplainerFlow: Calling Minimax API at", MINIMAX_API_URL, "with payload:", JSON.stringify(minimaxPayload, null, 2).substring(0, 300) + "..."); // Log truncated payload
      const response = await fetch(MINIMAX_API_URL, { // Make sure MINIMAX_API_URL is correct
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MINIMAX_API_KEY}`, // Common auth, verify with Minimax
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(minimaxPayload)
      });

      let parsedJson;
      const responseText = await response.text(); 

      try {
        parsedJson = JSON.parse(responseText);
        console.log("imagineExplainerFlow: Minimax API raw parsed JSON:", JSON.stringify(parsedJson, null, 2));
      } catch (jsonError) {
        console.error("imagineExplainerFlow: Minimax API Failed to parse JSON response. Status:", response.status, "Text:", responseText, "Error:", jsonError);
        parsedJson = null; 
        if (!response.ok) { 
            minimaxResponseData = { 
                error: `HTTP error ${response.status} from Minimax`, 
                message: `Failed to submit video task to Minimax. Server said: ${response.statusText || responseText}`
            };
        } else { 
             minimaxResponseData = { 
                error: "Invalid JSON response from Minimax", 
                message: `Received a non-JSON response from Minimax despite a success status. Response text: ${responseText}`
            };
        }
      }

      if (!minimaxResponseData) { // If not set by JSON parse error block
        if (response.ok) {
          // IMPORTANT: Adapt this based on Minimax's ACTUAL response structure.
          // It might return an object directly, or an array, or nest the job info.
          if (parsedJson && typeof parsedJson === 'object') {
            minimaxResponseData = parsedJson as z.infer<typeof MinimaxJobInfoSchema>; // Type assertion
             // Example: if Minimax returns task_id, map it to our schema's taskId
             if (parsedJson.task_id && !minimaxResponseData.taskId) minimaxResponseData.taskId = parsedJson.task_id;
             if (parsedJson.url && !minimaxResponseData.videoUrl) minimaxResponseData.videoUrl = parsedJson.url;

          } else {
            console.warn("imagineExplainerFlow: Minimax API successful, but response format was unexpected:", parsedJson);
            minimaxResponseData = {
              error: "Unexpected response format from Minimax after success status.",
              message: parsedJson ? `Received: ${JSON.stringify(parsedJson)}` : (response.statusText || "Response was not valid JSON or was empty."),
            };
          }
        } else { // !response.ok (HTTP error)
          if (parsedJson && typeof parsedJson === 'object' && parsedJson !== null) {
            minimaxResponseData = parsedJson as z.infer<typeof MinimaxJobInfoSchema>;
            if (!minimaxResponseData.error && !minimaxResponseData.message) {
              minimaxResponseData.error = `HTTP ${response.status}: ${response.statusText || 'Unknown Minimax Error'}`;
              minimaxResponseData.message = JSON.stringify(parsedJson);
            }
          } else {
            minimaxResponseData = {
              error: `HTTP error ${response.status}`,
              message: response.statusText || responseText || "Minimax API request failed with non-JSON response.",
            };
          }
        }
      }
      console.log("imagineExplainerFlow: Processed Minimax API Data (to be returned):", JSON.stringify(minimaxResponseData, null, 2));

    } catch (e) { 
      console.error("imagineExplainerFlow: Error during execution:", e);
      if (!minimaxResponseData) { 
          minimaxResponseData = { error: "Flow execution error", message: (e as Error).message };
      } else { 
          const flowErrorMessage = `Flow error: ${(e as Error).message}`;
          minimaxResponseData.error = minimaxResponseData.error ? `${minimaxResponseData.error}; ${flowErrorMessage}` : flowErrorMessage;
          if (!minimaxResponseData.message) minimaxResponseData.message = ""; 
      }
    }
    
    return {
      explanation: aiExplanation,
      videoRenderJob: minimaxResponseData, 
    };
  }
);
