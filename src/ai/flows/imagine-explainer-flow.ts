
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

// RunwayML API Configuration
// IMPORTANT: You MUST verify this endpoint with RunwayML's official API documentation for text-to-video.
const RUNWAYML_API_URL = 'https://api.runwayml.com/v1/tasks'; 
let RUNWAYML_API_KEY = process.env.RUNWAYML_API_KEY;

if (!RUNWAYML_API_KEY) {
  console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.warn("!!! WARNING: RUNWAYML_API_KEY environment variable not set in your .env.local file or deployment environment. !!!");
  console.warn("!!! Falling back to a hardcoded key. THIS IS INSECURE for production. !!!");
  console.warn("!!! Please set RUNWAYML_API_KEY for proper and secure operation. !!!");
  console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  RUNWAYML_API_KEY = 'key_eb1306a1d27ae6d3d2ad8569164d5b51990f5e14bbe4ecd5065467905981ff08eb52562fc2aede60b950b20069c30d213638d0a7661a82967223321976ff6578'; // Updated Fallback Key
}


const ImagineExplainerInputSchema = z.object({
  topic: z.string().describe('The complex topic to be explained simply and used for the video.'),
});
export type ImagineExplainerInput = z.infer<typeof ImagineExplainerInputSchema>;

// Schema for the AI-generated text explanation part
const TextExplanationSchema = z.object({
  explanation: z.string().describe('A simple, imaginative explanation of the topic.'),
});

// Schema for the RunwayML API response (task submission)
// This is a generic schema. You might need to adjust it based on RunwayML's actual response.
const RunwayMLJobInfoSchema = z.object({
  task_id: z.string().optional().describe('The ID of the video generation task submitted to RunwayML.'),
  status: z.string().optional().describe('The initial status of the video generation task (e.g., "pending", "running", "completed", "failed").'),
  output_url: z.string().optional().describe('URL to the generated video if available immediately (unlikely for initial response).'),
  error: z.string().nullable().optional().describe('Captures error messages from RunwayML if the task submission itself fails or the task later fails.'),
  message: z.string().nullable().optional().describe('Additional messages from RunwayML.'),
  // Add any other fields you expect from RunwayML's initial task response
}).passthrough(); // passthrough() allows other fields RunwayML might return without schema validation errors.


const ImagineExplainerOutputSchema = z.object({
  explanation: z.string().describe('The AI-generated simple, imaginative explanation of the topic.'),
  videoRenderJob: RunwayMLJobInfoSchema.nullable().describe('The response from the RunwayML API regarding the video generation task, or null if the API call failed before a structured response was received.'),
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
    let runwayMLResponseData: z.infer<typeof RunwayMLJobInfoSchema> | null = null;

    if (!RUNWAYML_API_KEY) {
        console.error("imagineExplainerFlow: CRITICAL - RunwayML API Key is not configured. Video generation will fail.");
        // Return a specific error structure that the frontend can interpret
        return {
            explanation: "RunwayML API Key not configured. Please set the RUNWAYML_API_KEY environment variable. Cannot generate video explanation.",
            videoRenderJob: { error: "RunwayML API Key not configured.", message: "Please set the RUNWAYML_API_KEY environment variable." },
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

      // 2. Prepare data for RunwayML API
      // This is a common payload structure for text-to-video.
      // You MUST consult RunwayML's API documentation for the specific model you intend to use (e.g., Gen-1, Gen-2)
      // and adjust parameters accordingly (e.g., model_id, duration_seconds, aspect_ratio, seed, etc.).
      const runwayMLPayload = {
        text_prompt: aiExplanation,
        // Example additional parameters (uncomment and adjust as per RunwayML docs):
        // model_id: "gen-2", // Or "gen-1", or specific model identifier
        // seed: Math.floor(Math.random() * 100000), // For reproducibility
        // aspect_ratio: "16:9", // e.g., "16:9", "1:1", "9:16"
        // duration_seconds: 4, // Desired video duration
        // motion_score: 0.5, // Controls amount of motion
        // upscale: false, // Whether to upscale the video
      };

      // 3. Call RunwayML API
      console.log("imagineExplainerFlow: Calling RunwayML API at", RUNWAYML_API_URL, "with payload:", JSON.stringify(runwayMLPayload, null, 2).substring(0, 200) + "..."); // Log truncated payload
      const response = await fetch(RUNWAYML_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RUNWAYML_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json', // Important for some APIs
        },
        body: JSON.stringify(runwayMLPayload)
      });

      let parsedJson;
      const responseText = await response.text(); // Get response text for better error diagnosis

      try {
        parsedJson = JSON.parse(responseText);
        console.log("imagineExplainerFlow: RunwayML API raw parsed JSON:", JSON.stringify(parsedJson, null, 2));
      } catch (jsonError) {
        console.error("imagineExplainerFlow: RunwayML API Failed to parse JSON response. Status:", response.status, "Text:", responseText, "Error:", jsonError);
        parsedJson = null; // Ensure parsedJson is null if parsing fails
        // Set runwayMLResponseData based on whether the HTTP call was itself an error or just the JSON parsing
        if (!response.ok) { // HTTP error like 400, 401, 500
            runwayMLResponseData = { 
                error: `HTTP error ${response.status} from RunwayML`, 
                message: `Failed to submit video task to RunwayML. Server said: ${response.statusText || responseText}`
            };
        } else { // HTTP 2xx but invalid JSON
             runwayMLResponseData = { 
                error: "Invalid JSON response from RunwayML", 
                message: `Received a non-JSON response from RunwayML despite a success status. Response text: ${responseText}`
            };
        }
      }

      // If runwayMLResponseData was not set by a JSON parse error, process the parsedJson
      if (!runwayMLResponseData) {
        if (response.ok) {
          // Assuming successful response is the job info object directly or an array containing it
          if (parsedJson && typeof parsedJson === 'object' && !Array.isArray(parsedJson)) {
            runwayMLResponseData = parsedJson; 
          } else if (parsedJson && Array.isArray(parsedJson) && parsedJson.length > 0 && typeof parsedJson[0] === 'object') {
            // If API returns an array of tasks, take the first one.
            runwayMLResponseData = parsedJson[0]; 
            console.warn("imagineExplainerFlow: RunwayML API returned an array of tasks, using the first one.");
          } else {
            // Successful HTTP but unexpected JSON structure
            console.warn("imagineExplainerFlow: RunwayML API successful, but response format was unexpected or not a single task object:", parsedJson);
            runwayMLResponseData = {
              error: "Unexpected response format from RunwayML after success status.",
              message: parsedJson ? `Received: ${JSON.stringify(parsedJson)}` : (response.statusText || "Response was not valid JSON or was empty."),
            };
          }
        } else { // !response.ok (HTTP error) and JSON might or might not have parsed
          if (parsedJson && typeof parsedJson === 'object' && parsedJson !== null) {
            // If an error JSON was parsed from RunwayML, use it
            runwayMLResponseData = parsedJson; 
            // Ensure .error or .message exists if API uses other fields for error details
            if (!runwayMLResponseData.error && !runwayMLResponseData.message) {
              runwayMLResponseData.error = `HTTP ${response.status}: ${response.statusText || 'Unknown RunwayML Error'}`;
              runwayMLResponseData.message = JSON.stringify(parsedJson); // Put the whole object in message if specific error fields absent
            }
          } else {
            // HTTP error and no parsable JSON error object
            runwayMLResponseData = {
              error: `HTTP error ${response.status}`,
              message: response.statusText || responseText || "RunwayML API request failed with non-JSON response.",
            };
          }
        }
      }
      console.log("imagineExplainerFlow: Processed RunwayML API Data (to be returned):", JSON.stringify(runwayMLResponseData, null, 2));

    } catch (e) { // Catches errors from AI prompt, or network error from fetch, etc. (not API response errors handled above)
      console.error("imagineExplainerFlow: Error during execution (outside specific API call error handling):", e);
      // Ensure runwayMLResponseData is an object even if previous steps failed before API call
      if (!runwayMLResponseData) { 
          runwayMLResponseData = { error: "Flow execution error", message: (e as Error).message };
      } else { // If runwayMLResponseData exists from a failed API call, append this flow error
          const flowErrorMessage = `Flow error: ${(e as Error).message}`;
          runwayMLResponseData.error = runwayMLResponseData.error ? `${runwayMLResponseData.error}; ${flowErrorMessage}` : flowErrorMessage;
          if (!runwayMLResponseData.message) runwayMLResponseData.message = ""; // Ensure message exists
      }
    }
    
    return {
      explanation: aiExplanation,
      videoRenderJob: runwayMLResponseData, // This should now match RunwayMLJobInfoSchema or be null
    };
  }
);

// Useful for debugging: Example input to test the flow
/*
(async () => {
  if (process.env.NODE_ENV === 'development') {
    try {
      const result = await imagineExplainer({ topic: "Black Holes" });
      console.log("Test imagineExplainer result:", JSON.stringify(result, null, 2));
    } catch (e) {
      console.error("Test imagineExplainer error:", e);
    }
  }
})();
*/
