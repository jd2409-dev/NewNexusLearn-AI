
'use server';
console.log("Loading AI Flow: imagine-explainer-flow.ts");

/**
 * @fileOverview Provides simple, imaginative explanations for complex topics
 * and initiates a video generation job using Hunyuan API.
 *
 * - imagineExplainer - A function that generates a simple explanation and starts a video generation task.
 * - ImagineExplainerInput - The input type for the imagineExplainer function.
 * - ImagineExplainerOutput - The return type for the imagineExplainer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { gemini15Flash } from '@genkit-ai/googleai';

// Hunyuan API Configuration
// IMPORTANT: You MUST verify this endpoint with Hunyuan's official API documentation.
const HUNYUAN_API_URL = 'https://api.hunyuan.tencent.com/some_video_endpoint'; // REPLACE WITH ACTUAL HUNYUAN VIDEO ENDPOINT
const HUNYUAN_API_KEY_FALLBACK = "SG_e1cb88f73da1d0bd"; // User provided key

let HUNYUAN_API_KEY = process.env.HUNYUAN_API_KEY;

if (!HUNYUAN_API_KEY) {
  console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.warn("!!! WARNING: HUNYUAN_API_KEY environment variable not set in your .env.local file or deployment environment. !!!");
  console.warn("!!! Using fallback API key for Hunyuan. This is insecure for production. !!!");
  console.warn("!!! Please set HUNYUAN_API_KEY for proper and secure operation. !!!");
  console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  HUNYUAN_API_KEY = HUNYUAN_API_KEY_FALLBACK;
} else {
    console.log("imagineExplainerFlow: Using Hunyuan API Key from environment variable.");
}


const ImagineExplainerInputSchema = z.object({
  topic: z.string().describe('The complex topic to be explained simply and used for the video.'),
});
export type ImagineExplainerInput = z.infer<typeof ImagineExplainerInputSchema>;

// Schema for the AI-generated text explanation part
const TextExplanationSchema = z.object({
  explanation: z.string().describe('A simple, imaginative explanation of the topic.'),
});

// Schema for the Hunyuan API response (task submission)
// This is a VERY GENERIC schema. You MUST adjust it based on Hunyuan's actual response.
const HunyuanJobInfoSchema = z.object({
  taskId: z.string().optional().describe('The ID of the video generation task submitted to Hunyuan.'),
  status: z.string().optional().describe('The initial status of the video generation task.'),
  videoUrl: z.string().optional().describe('URL to the generated video if available immediately.'),
  error: z.string().nullable().optional().describe('Captures error messages from Hunyuan.'),
  message: z.string().nullable().optional().describe('Additional messages from Hunyuan.'),
  // Add any other fields you expect from Hunyuan's initial task response
}).passthrough(); // passthrough() allows other fields Hunyuan might return without schema validation errors.


const ImagineExplainerOutputSchema = z.object({
  explanation: z.string().describe('The AI-generated simple, imaginative explanation of the topic.'),
  videoRenderJob: HunyuanJobInfoSchema.nullable().describe('The response from the Hunyuan API regarding the video generation task, or null if the API call failed before a structured response was received.'),
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
    let hunyuanResponseData: z.infer<typeof HunyuanJobInfoSchema> | null = null;

    if (!HUNYUAN_API_KEY) { // Double check after potential fallback logic
        console.error("imagineExplainerFlow: CRITICAL - Hunyuan API_KEY is not configured. Video generation will fail.");
        return {
            explanation: "Hunyuan API_KEY not configured. Please set the HUNYUAN_API_KEY environment variable. Cannot generate video explanation.",
            videoRenderJob: { error: "Hunyuan API_KEY not configured.", message: "Please set the HUNYUAN_API_KEY environment variable." },
        };
    }

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

      // 2. Prepare data for Hunyuan API
      // IMPORTANT: This is a GENERIC payload. You MUST consult Hunyuan's API documentation
      // for the specific model and parameters required for text-to-video or desired task.
      const hunyuanPayload = {
        text_prompt: aiExplanation, // This is a guess, Hunyuan might call it 'text_input', 'description', etc.
        // model_id: "hunyuan_video_model_xyz", // Example: You'll likely need to specify a model
        // duration_seconds: 10, // Example: Desired video duration in seconds
        // aspect_ratio: "16:9", // Example
        // ... other Hunyuan specific parameters
      };

      // 3. Call Hunyuan API
      console.log("imagineExplainerFlow: Calling Hunyuan API at", HUNYUAN_API_URL, "with payload:", JSON.stringify(hunyuanPayload, null, 2).substring(0, 300) + "..."); // Log truncated payload
      const response = await fetch(HUNYUAN_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUNYUAN_API_KEY}`, // Common auth, verify with Hunyuan
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          // Add any other specific headers Hunyuan API requires (e.g., API version)
        },
        body: JSON.stringify(hunyuanPayload)
      });

      let parsedJson;
      const responseText = await response.text(); 

      try {
        parsedJson = JSON.parse(responseText);
        console.log("imagineExplainerFlow: Hunyuan API raw parsed JSON:", JSON.stringify(parsedJson, null, 2));
      } catch (jsonError) {
        console.error("imagineExplainerFlow: Hunyuan API Failed to parse JSON response. Status:", response.status, "Text:", responseText, "Error:", jsonError);
        parsedJson = null; 
        if (!response.ok) { 
            hunyuanResponseData = { 
                error: `HTTP error ${response.status} from Hunyuan`, 
                message: `Failed to submit video task to Hunyuan. Server said: ${response.statusText || responseText}`
            };
        } else { 
             hunyuanResponseData = { 
                error: "Invalid JSON response from Hunyuan", 
                message: `Received a non-JSON response from Hunyuan despite a success status. Response text: ${responseText}`
            };
        }
      }

      if (!hunyuanResponseData) { // If not set by JSON parse error block
        if (response.ok) {
          // IMPORTANT: Adapt this based on Hunyuan's ACTUAL response structure.
          // It might return an object directly, or an array, or nest the job info.
          if (parsedJson && typeof parsedJson === 'object' && !Array.isArray(parsedJson)) { // Assuming single object response
            hunyuanResponseData = parsedJson as z.infer<typeof HunyuanJobInfoSchema>;
             // Example: if Hunyuan returns task_id, map it to our schema's taskId
             if (parsedJson.task_id && !hunyuanResponseData.taskId) hunyuanResponseData.taskId = parsedJson.task_id;
             // if (parsedJson.video_url && !hunyuanResponseData.videoUrl) hunyuanResponseData.videoUrl = parsedJson.video_url;

          } else if (parsedJson && Array.isArray(parsedJson) && parsedJson.length > 0 && typeof parsedJson[0] === 'object') {
            // If Hunyuan returns an array of tasks, take the first one
            console.log("imagineExplainerFlow: Hunyuan API returned an array, taking the first element.");
            hunyuanResponseData = parsedJson[0] as z.infer<typeof HunyuanJobInfoSchema>;
            if (parsedJson[0].task_id && !hunyuanResponseData.taskId) hunyuanResponseData.taskId = parsedJson[0].task_id;

          } else {
            console.warn("imagineExplainerFlow: Hunyuan API successful, but response format was unexpected:", parsedJson);
            hunyuanResponseData = {
              error: "Unexpected response format from Hunyuan after success status.",
              message: parsedJson ? `Received: ${JSON.stringify(parsedJson)}` : (response.statusText || "Response was not valid JSON or was empty."),
            };
          }
        } else { // !response.ok (HTTP error)
          if (parsedJson && typeof parsedJson === 'object' && parsedJson !== null) {
            hunyuanResponseData = parsedJson as z.infer<typeof HunyuanJobInfoSchema>;
            if (!hunyuanResponseData.error && !hunyuanResponseData.message) {
              hunyuanResponseData.error = `HTTP ${response.status}: ${response.statusText || 'Unknown Hunyuan Error'}`;
              hunyuanResponseData.message = JSON.stringify(parsedJson);
            }
          } else {
            hunyuanResponseData = {
              error: `HTTP error ${response.status}`,
              message: response.statusText || responseText || "Hunyuan API request failed with non-JSON response.",
            };
          }
        }
      }
      console.log("imagineExplainerFlow: Processed Hunyuan API Data (to be returned):", JSON.stringify(hunyuanResponseData, null, 2));

    } catch (e) { 
      console.error("imagineExplainerFlow: Error during execution:", e);
      if (!hunyuanResponseData) { 
          hunyuanResponseData = { error: "Flow execution error", message: (e as Error).message };
      } else { 
          const flowErrorMessage = `Flow error: ${(e as Error).message}`;
          hunyuanResponseData.error = hunyuanResponseData.error ? `${hunyuanResponseData.error}; ${flowErrorMessage}` : flowErrorMessage;
          if (!hunyuanResponseData.message) hunyuanResponseData.message = ""; 
      }
    }
    
    return {
      explanation: aiExplanation,
      videoRenderJob: hunyuanResponseData, 
    };
  }
);
