
'use server';
console.log("Loading AI Flow: imagine-explainer-flow.ts");

/**
 * @fileOverview Provides simple, imaginative explanations for complex topics
 * and initiates a video generation job using the Magic Hour API.
 *
 * - imagineExplainer - A function that generates a simple explanation and starts a video generation task.
 * - ImagineExplainerInput - The input type for the imagineExplainer function.
 * - ImagineExplainerOutput - The return type for the imagineExplainer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { gemini15Flash } from '@genkit-ai/googleai';

// Magic Hour API Configuration
// IMPORTANT: Replace MAGICHOUR_API_URL_PLACEHOLDER with the actual Magic Hour API endpoint for video generation.
// Consult Magic Hour documentation for the correct endpoint and payload structure.
const MAGICHOUR_API_URL_PLACEHOLDER = 'https://api.magichour.ai/v1/generations'; // EXAMPLE - VERIFY THIS
const MAGICHOUR_API_KEY_FALLBACK = "mhk_live_CwsFFLJMtI32MTp117GQmTjLDAd6rU5HKIKY3XUwO9p5MuQPCYI9klhTLktFMhguCbNlrNgcF5EU3R4t";

let MAGICHOUR_API_KEY = process.env.MAGICHOUR_API_KEY;
const MAGICHOUR_API_URL = process.env.MAGICHOUR_API_URL || MAGICHOUR_API_URL_PLACEHOLDER;

if (!MAGICHOUR_API_KEY) {
  console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.warn("!!! WARNING: MAGICHOUR_API_KEY environment variable not set in your .env.local file or deployment environment. !!!");
  console.warn("!!! Using fallback API key for Magic Hour. This is insecure for production and might not be valid. !!!");
  console.warn("!!! Please set MAGICHOUR_API_KEY for proper and secure operation. !!!");
  console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  MAGICHOUR_API_KEY = MAGICHOUR_API_KEY_FALLBACK;
} else {
    console.log("imagineExplainerFlow: Using Magic Hour API Key from environment variable.");
}


const ImagineExplainerInputSchema = z.object({
  topic: z.string().describe('The complex topic to be explained simply and used for the video script.'),
});
export type ImagineExplainerInput = z.infer<typeof ImagineExplainerInputSchema>;

// Schema for the AI-generated text explanation part
const TextExplanationSchema = z.object({
  explanation: z.string().describe('A simple, imaginative explanation of the topic, to be used as a video script.'),
});

// Schema for the Magic Hour API response (task submission for video generation)
// This is a GENERIC schema. You MUST adjust it based on Magic Hour's actual response.
// Common fields include task_id, job_id, status, video_url (when ready), error, message.
const MagicHourJobInfoSchema = z.object({
  id: z.string().optional().describe('The ID of the video generation task submitted to Magic Hour (e.g., video_id, job_id, task_id).'),
  status: z.string().optional().describe('The initial status of the video generation task (e.g., pending, processing, success, failed).'),
  video_url: z.string().url().optional().describe('URL to the generated video if available immediately or upon completion.'),
  error: z.string().nullable().optional().describe('Captures error messages from Magic Hour.'),
  message: z.string().nullable().optional().describe('Additional messages or details from Magic Hour.'),
  // Add any other fields you expect from Magic Hour's initial task response
}).passthrough(); // passthrough() allows other fields Magic Hour might return without schema validation errors.


const ImagineExplainerOutputSchema = z.object({
  explanation: z.string().describe('The AI-generated simple, imaginative explanation of the topic (used as script).'),
  videoRenderJob: MagicHourJobInfoSchema.nullable().describe('The response from the Magic Hour API regarding the video generation task, or null if the API call failed before a structured response was received.'),
});
export type ImagineExplainerOutput = z.infer<typeof ImagineExplainerOutputSchema>;

export async function imagineExplainer(input: ImagineExplainerInput): Promise<ImagineExplainerOutput> {
  return imagineExplainerFlow(input);
}

// AI Prompt for generating the text explanation (script)
const explanationPrompt = ai.definePrompt({
  name: 'imagineExplainerTextPrompt',
  model: gemini15Flash,
  input: {schema: ImagineExplainerInputSchema},
  output: {schema: TextExplanationSchema}, // AI generates text explanation
  prompt: `You are 'Imagine Explainer', an AI that explains complex topics in a super simple, imaginative, and friendly way, as if explaining to a curious child or someone with no prior knowledge. Make it engaging and easy to visualize. This explanation will be used as a script for an AI video generator (Magic Hour).

Topic: {{{topic}}}

Please provide a simple explanation for the topic: "{{{topic}}}". This will be the main script for the video.
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
    let aiExplanation = `Video script about: ${input.topic}`; // Fallback prompt if AI explanation fails
    let magicHourResponseData: z.infer<typeof MagicHourJobInfoSchema> | null = null;

    if (!MAGICHOUR_API_KEY) {
        console.error("imagineExplainerFlow: CRITICAL - Magic Hour API_KEY is not configured (neither in env nor as fallback). Video generation will fail.");
        return {
            explanation: `Magic Hour API_KEY not configured. Please set the MAGICHOUR_API_KEY environment variable. Cannot generate video. Topic was: ${input.topic}`,
            videoRenderJob: { error: "Magic Hour API_KEY not configured.", message: "Please set the MAGICHOUR_API_KEY environment variable." },
        };
    }
    if (MAGICHOUR_API_URL === MAGICHOUR_API_URL_PLACEHOLDER) {
        console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.warn(`!!! WARNING: Using a placeholder MAGICHOUR_API_URL (${MAGICHOUR_API_URL_PLACEHOLDER}). This may not be the correct endpoint. !!!`);
        console.warn(`!!! Please verify the Magic Hour API endpoint for generating videos in their documentation and update it in the flow or via MAGICHOUR_API_URL environment variable. !!!`);
        console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    }

    try {
      // 1. Generate text explanation (script) using AI
      console.log("imagineExplainerFlow: Generating text explanation/script for topic:", input.topic);
      const { output: explanationOutput } = await explanationPrompt(input);
      
      if (explanationOutput && typeof explanationOutput.explanation === 'string' && explanationOutput.explanation.trim() !== "") {
        aiExplanation = explanationOutput.explanation;
        console.log("imagineExplainerFlow: AI explanation/script generated successfully.");
      } else {
        console.warn("imagineExplainerFlow: AI prompt returned undefined, malformed, or empty output for input:", input, "Output received:", explanationOutput, "Using fallback script for Magic Hour.");
        // aiExplanation is already set to fallback
      }

      // 2. Prepare data for Magic Hour API (Video Generation from Script)
      // IMPORTANT: This is a GENERIC payload. You MUST consult Magic Hour's API documentation
      // for the specific model and parameters required for generating a video from a script.
      const magicHourPayload = {
        text_prompt: aiExplanation, // Assuming Magic Hour uses a field like 'text_prompt' or 'script'
        topic: input.topic, // Sending topic as well, might be useful for titling or metadata
        // replica_id: "YOUR_MAGIC_HOUR_REPLICA_ID_IF_NEEDED", // If Magic Hour uses pre-trained replicas/voices
        // model_id: "MAGIC_HOUR_VIDEO_MODEL_ID", // If you need to specify a model
        // duration_seconds: 30, // Example
        // aspect_ratio: "16:9", // Example
        // ... other Magic Hour specific parameters
      };

      // 3. Call Magic Hour API
      console.log("imagineExplainerFlow: Calling Magic Hour API at", MAGICHOUR_API_URL, "with payload:", JSON.stringify(magicHourPayload, null, 2).substring(0, 300) + "...");
      const response = await fetch(MAGICHOUR_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MAGICHOUR_API_KEY}`, // Common for many APIs, verify if Magic Hour uses this or a custom header like 'X-MagicHour-Api-Key'
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          // Add any other specific headers Magic Hour API requires
        },
        body: JSON.stringify(magicHourPayload)
      });

      let parsedJson;
      const responseText = await response.text(); 

      try {
        parsedJson = JSON.parse(responseText);
        console.log("imagineExplainerFlow: Magic Hour API raw parsed JSON response:", JSON.stringify(parsedJson, null, 2));
      } catch (jsonError) {
        console.error("imagineExplainerFlow: Magic Hour API Failed to parse JSON response. Status:", response.status, "Text:", responseText, "Error:", jsonError);
        parsedJson = null; 
        if (!response.ok) { 
            magicHourResponseData = { 
                error: `HTTP error ${response.status} from Magic Hour`, 
                message: `Failed to submit video task to Magic Hour. Server said: ${response.statusText || responseText}. Attempted URL: ${MAGICHOUR_API_URL}.`
            };
        } else { // response.ok but not valid JSON
             magicHourResponseData = { 
                error: "Invalid JSON response from Magic Hour", 
                message: `Received a non-JSON response from Magic Hour despite a success status. Response text: ${responseText}. Attempted URL: ${MAGICHOUR_API_URL}.`
            };
        }
      }

      if (!magicHourResponseData) { // If not set by JSON parse error block
        if (response.ok) {
          // IMPORTANT: Adapt this based on Magic Hour's ACTUAL response structure for video generation tasks.
          if (parsedJson && typeof parsedJson === 'object' && !Array.isArray(parsedJson)) { 
            magicHourResponseData = parsedJson as z.infer<typeof MagicHourJobInfoSchema>;
             // Try to map common fields if Magic Hour uses different names
             if (parsedJson.task_id && !magicHourResponseData.id) magicHourResponseData.id = parsedJson.task_id;
             if (parsedJson.job_id && !magicHourResponseData.id) magicHourResponseData.id = parsedJson.job_id;
             if (parsedJson.generation_id && !magicHourResponseData.id) magicHourResponseData.id = parsedJson.generation_id;
             if (parsedJson.url && !magicHourResponseData.video_url) magicHourResponseData.video_url = parsedJson.url;
          } else if (parsedJson && Array.isArray(parsedJson) && parsedJson.length > 0 && typeof parsedJson[0] === 'object') {
            console.log("imagineExplainerFlow: Magic Hour API returned an array of tasks, taking the first element.");
            magicHourResponseData = parsedJson[0] as z.infer<typeof MagicHourJobInfoSchema>;
            if (parsedJson[0].task_id && !magicHourResponseData.id) magicHourResponseData.id = parsedJson[0].task_id;
            if (parsedJson[0].job_id && !magicHourResponseData.id) magicHourResponseData.id = parsedJson[0].job_id;
            if (parsedJson[0].generation_id && !magicHourResponseData.id) magicHourResponseData.id = parsedJson[0].generation_id;
            if (parsedJson[0].url && !magicHourResponseData.video_url) magicHourResponseData.video_url = parsedJson[0].url;
          } else {
            console.warn("imagineExplainerFlow: Magic Hour API successful, but response format was unexpected:", parsedJson);
            magicHourResponseData = {
              error: "Unexpected response format from Magic Hour after success status.",
              message: parsedJson ? `Received: ${JSON.stringify(parsedJson)}` : (response.statusText || "Response was not valid JSON or was empty."),
            };
          }
        } else { // !response.ok (HTTP error)
          if (parsedJson && typeof parsedJson === 'object' && parsedJson !== null) {
            magicHourResponseData = parsedJson as z.infer<typeof MagicHourJobInfoSchema>;
            if (!magicHourResponseData.error && !magicHourResponseData.message) {
              magicHourResponseData.error = `HTTP ${response.status}: ${response.statusText || 'Unknown Magic Hour Error'}`;
              magicHourResponseData.message = JSON.stringify(parsedJson);
            }
          } else {
            magicHourResponseData = {
              error: `HTTP error ${response.status}`,
              message: response.statusText || responseText || "Magic Hour API request failed with non-JSON response.",
            };
          }
        }
      }
      console.log("imagineExplainerFlow: Processed Magic Hour API Data (to be returned):", JSON.stringify(magicHourResponseData, null, 2));

    } catch (e) { 
      console.error("imagineExplainerFlow: Error during execution (potentially fetch failed):", e);
      const errorMessage = (e as Error).message || "Unknown error during flow execution.";
      magicHourResponseData = { 
          error: "Flow execution error or fetch failed", 
          message: `Details: ${errorMessage}. Attempted URL: ${MAGICHOUR_API_URL}. Please ensure the API endpoint is correct and reachable from the server.` 
      };
    }
    
    return {
      explanation: aiExplanation,
      videoRenderJob: magicHourResponseData, 
    };
  }
);

