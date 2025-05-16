
'use server';
console.log("Loading AI Flow: imagine-explainer-flow.ts");

/**
 * @fileOverview Provides simple, imaginative explanations for complex topics
 * and initiates a video generation job using Tavus API.
 *
 * - imagineExplainer - A function that generates a simple explanation and starts a video generation task.
 * - ImagineExplainerInput - The input type for the imagineExplainer function.
 * - ImagineExplainerOutput - The return type for the imagineExplainer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { gemini15Flash } from '@genkit-ai/googleai';

// Tavus API Configuration
// IMPORTANT: Replace TAVUS_API_URL_PLACEHOLDER with the actual Tavus API endpoint for video generation.
// This might be something like https://api.tavus.io/v2/videos or similar. Consult Tavus documentation.
const TAVUS_API_URL_PLACEHOLDER = 'https://api.tavus.io/v2/videos'; // EXAMPLE - VERIFY THIS
const TAVUS_API_KEY_FALLBACK = "e16b9505f1f04365bc55aaf8fb8e660f"; // Your provided key

let TAVUS_API_KEY = process.env.TAVUS_API_KEY;
const TAVUS_API_URL = process.env.TAVUS_API_URL || TAVUS_API_URL_PLACEHOLDER;

if (!TAVUS_API_KEY) {
  console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.warn("!!! WARNING: TAVUS_API_KEY environment variable not set in your .env.local file or deployment environment. !!!");
  console.warn("!!! Using fallback API key for Tavus. This is insecure for production and might not be valid. !!!");
  console.warn("!!! Please set TAVUS_API_KEY for proper and secure operation. !!!");
  console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  TAVUS_API_KEY = TAVUS_API_KEY_FALLBACK;
} else {
    console.log("imagineExplainerFlow: Using Tavus API Key from environment variable.");
}


const ImagineExplainerInputSchema = z.object({
  topic: z.string().describe('The complex topic to be explained simply and used for the video script.'),
});
export type ImagineExplainerInput = z.infer<typeof ImagineExplainerInputSchema>;

// Schema for the AI-generated text explanation part
const TextExplanationSchema = z.object({
  explanation: z.string().describe('A simple, imaginative explanation of the topic, to be used as a video script.'),
});

// Schema for the Tavus API response (task submission for video generation)
// This is a GENERIC schema. You MUST adjust it based on Tavus's actual response.
// Common fields include task_id, job_id, status, video_url (when ready), error, message.
const TavusJobInfoSchema = z.object({
  // Tavus API response structure might vary. This is a guess.
  // Consult Tavus documentation for the exact fields.
  // Example fields:
  id: z.string().optional().describe('The ID of the video generation task submitted to Tavus (e.g., video_id, job_id, task_id).'),
  status: z.string().optional().describe('The initial status of the video generation task (e.g., pending, processing).'),
  video_url: z.string().url().optional().describe('URL to the generated video if available immediately or upon completion.'), // If Tavus returns this
  error: z.string().nullable().optional().describe('Captures error messages from Tavus.'),
  message: z.string().nullable().optional().describe('Additional messages or details from Tavus.'),
  // Add any other fields you expect from Tavus's initial task response for generating a video
}).passthrough(); // passthrough() allows other fields Tavus might return without schema validation errors.


const ImagineExplainerOutputSchema = z.object({
  explanation: z.string().describe('The AI-generated simple, imaginative explanation of the topic (used as script).'),
  videoRenderJob: TavusJobInfoSchema.nullable().describe('The response from the Tavus API regarding the video generation task, or null if the API call failed before a structured response was received.'),
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
  prompt: `You are 'Imagine Explainer', an AI that explains complex topics in a super simple, imaginative, and friendly way, as if explaining to a curious child or someone with no prior knowledge. Make it engaging and easy to visualize. This explanation will be used as a script for an AI video generator (Tavus).

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
    let tavusResponseData: z.infer<typeof TavusJobInfoSchema> | null = null;

    if (!TAVUS_API_KEY) {
        console.error("imagineExplainerFlow: CRITICAL - Tavus API_KEY is not configured (neither in env nor as fallback). Video generation will fail.");
        return {
            explanation: `Tavus API_KEY not configured. Please set the TAVUS_API_KEY environment variable in your .env.local file or deployment settings. Cannot generate video. Topic was: ${input.topic}`,
            videoRenderJob: { error: "Tavus API_KEY not configured.", message: "Please set the TAVUS_API_KEY environment variable." },
        };
    }
    if (TAVUS_API_URL === TAVUS_API_URL_PLACEHOLDER && TAVUS_API_URL_PLACEHOLDER === 'https://api.tavus.io/v2/videos') { // Check against specific placeholder
        console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.warn("!!! WARNING: Using a placeholder TAVUS_API_URL for video generation. This may not be the correct endpoint. !!!");
        console.warn(`!!! Please verify the Tavus API endpoint for generating videos (currently: ${TAVUS_API_URL_PLACEHOLDER}) in Tavus documentation and update it in the flow or via TAVUS_API_URL environment variable. !!!`);
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
        console.warn("imagineExplainerFlow: AI prompt returned undefined, malformed, or empty output for input:", input, "Output received:", explanationOutput, "Using fallback script for Tavus.");
        // aiExplanation is already set to fallback
      }

      // 2. Prepare data for Tavus API (Video Generation from Script)
      // IMPORTANT: This is a GENERIC payload. You MUST consult Tavus's API documentation
      // for the specific model and parameters required for generating a video from a script.
      // You will likely need to provide a 'replica_id' if you want a specific AI avatar/voice.
      const tavusPayload = {
        script: aiExplanation,
        // replica_id: "YOUR_PRE_EXISTING_TAVUS_REPLICA_ID", // IMPORTANT: You'll likely need to set this
        // title: `Video about ${input.topic}`, // Optional title
        // background_url: "some_default_background_image_or_video_url", // Optional
        // ... other Tavus specific parameters for video generation (e.g., model, aspect_ratio, output_format)
      };

      // 3. Call Tavus API
      console.log("imagineExplainerFlow: Calling Tavus API at", TAVUS_API_URL, "with payload:", JSON.stringify(tavusPayload, null, 2).substring(0, 300) + "..."); // Log truncated payload
      const response = await fetch(TAVUS_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': TAVUS_API_KEY, // Using x-api-key as per user's Firebase Function example for Tavus
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          // Add any other specific headers Tavus API requires
        },
        body: JSON.stringify(tavusPayload)
      });

      let parsedJson;
      const responseText = await response.text(); 

      try {
        parsedJson = JSON.parse(responseText);
        console.log("imagineExplainerFlow: Tavus API raw parsed JSON response:", JSON.stringify(parsedJson, null, 2));
      } catch (jsonError) {
        console.error("imagineExplainerFlow: Tavus API Failed to parse JSON response. Status:", response.status, "Text:", responseText, "Error:", jsonError);
        parsedJson = null; 
        if (!response.ok) { 
            tavusResponseData = { 
                error: `HTTP error ${response.status} from Tavus`, 
                message: `Failed to submit video task to Tavus. Server said: ${response.statusText || responseText}. Attempted URL: ${TAVUS_API_URL}.`
            };
        } else { // response.ok but not valid JSON
             tavusResponseData = { 
                error: "Invalid JSON response from Tavus", 
                message: `Received a non-JSON response from Tavus despite a success status. Response text: ${responseText}. Attempted URL: ${TAVUS_API_URL}.`
            };
        }
      }

      if (!tavusResponseData) { // If not set by JSON parse error block
        if (response.ok) {
          // IMPORTANT: Adapt this based on Tavus's ACTUAL response structure for video generation tasks.
          // It might return an object directly, or an array (e.g., if batch creation is possible).
          // Assuming single object response for now.
          if (parsedJson && typeof parsedJson === 'object' && !Array.isArray(parsedJson)) { 
            tavusResponseData = parsedJson as z.infer<typeof TavusJobInfoSchema>;
             // Try to map common fields if Tavus uses different names
             if (parsedJson.task_id && !tavusResponseData.id) tavusResponseData.id = parsedJson.task_id;
             if (parsedJson.job_id && !tavusResponseData.id) tavusResponseData.id = parsedJson.job_id;
             if (parsedJson.video_id && !tavusResponseData.id) tavusResponseData.id = parsedJson.video_id;
             if (parsedJson.url && !tavusResponseData.video_url) tavusResponseData.video_url = parsedJson.url; // if 'url' is the video url
          } else if (parsedJson && Array.isArray(parsedJson) && parsedJson.length > 0 && typeof parsedJson[0] === 'object') {
            console.log("imagineExplainerFlow: Tavus API returned an array of tasks, taking the first element.");
            tavusResponseData = parsedJson[0] as z.infer<typeof TavusJobInfoSchema>;
            if (parsedJson[0].task_id && !tavusResponseData.id) tavusResponseData.id = parsedJson[0].task_id;
            if (parsedJson[0].job_id && !tavusResponseData.id) tavusResponseData.id = parsedJson[0].job_id;
            if (parsedJson[0].video_id && !tavusResponseData.id) tavusResponseData.id = parsedJson[0].video_id;
            if (parsedJson[0].url && !tavusResponseData.video_url) tavusResponseData.video_url = parsedJson[0].url;
          } else {
            console.warn("imagineExplainerFlow: Tavus API successful, but response format was unexpected:", parsedJson);
            tavusResponseData = {
              error: "Unexpected response format from Tavus after success status.",
              message: parsedJson ? `Received: ${JSON.stringify(parsedJson)}` : (response.statusText || "Response was not valid JSON or was empty."),
            };
          }
        } else { // !response.ok (HTTP error)
          if (parsedJson && typeof parsedJson === 'object' && parsedJson !== null) {
            tavusResponseData = parsedJson as z.infer<typeof TavusJobInfoSchema>;
            if (!tavusResponseData.error && !tavusResponseData.message) { // if API error structure is different
              tavusResponseData.error = `HTTP ${response.status}: ${response.statusText || 'Unknown Tavus Error'}`;
              tavusResponseData.message = JSON.stringify(parsedJson); // Put the whole response in message
            }
          } else {
            tavusResponseData = {
              error: `HTTP error ${response.status}`,
              message: response.statusText || responseText || "Tavus API request failed with non-JSON response.",
            };
          }
        }
      }
      console.log("imagineExplainerFlow: Processed Tavus API Data (to be returned):", JSON.stringify(tavusResponseData, null, 2));

    } catch (e) { 
      console.error("imagineExplainerFlow: Error during execution (potentially fetch failed):", e);
      const errorMessage = (e as Error).message || "Unknown error during flow execution.";
      tavusResponseData = { 
          error: "Flow execution error or fetch failed", 
          message: `Details: ${errorMessage}. Attempted URL: ${TAVUS_API_URL}. Please ensure the API endpoint is correct and reachable from the server.` 
      };
    }
    
    return {
      explanation: aiExplanation,
      videoRenderJob: tavusResponseData, 
    };
  }
);
