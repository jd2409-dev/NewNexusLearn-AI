
'use server';
console.log("Loading AI Flow: imagine-explainer-flow.ts");

/**
 * @fileOverview Provides simple, imaginative explanations for complex topics
 * and initiates a video render job using Creatomate.
 *
 * - imagineExplainer - A function that generates a simple explanation and starts a video render.
 * - ImagineExplainerInput - The input type for the imagineExplainer function.
 * - ImagineExplainerOutput - The return type for the imagineExplainer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { gemini15Flash } from '@genkit-ai/googleai';

// Creatomate API Configuration
// IMPORTANT: The API key should ideally be stored in an environment variable (e.g., .env.local)
// and accessed via process.env.CREATOMATE_API_KEY.
// Hardcoding keys directly in the code is a security risk.
const CREATOMATE_API_URL = 'https://api.creatomate.com/v1/renders';
const CREATOMATE_API_KEY = 'c060d6a9a8394b21ab5a301cae21bf2b22c6b31fb4681b92f5f988c335ccabb0d7876b795f39c34f470588ebb5694f1c'; // User-provided API key
const CREATOMATE_TEMPLATE_ID = '7b96e9bb-5f69-4585-abe9-e9adfb96be06'; // User-provided template ID
const DEFAULT_VIDEO_SOURCE = 'https://creatomate.com/files/assets/7347c3b7-e1a8-4439-96f1-f3dfc95c3d28'; // User-provided video source

const ImagineExplainerInputSchema = z.object({
  topic: z.string().describe('The complex topic to be explained simply and used for the video.'),
});
export type ImagineExplainerInput = z.infer<typeof ImagineExplainerInputSchema>;

// Schema for the AI-generated text explanation part
const TextExplanationSchema = z.object({
  explanation: z.string().describe('A simple, imaginative explanation of the topic.'),
});

// Schema for the Creatomate API response (flexible for now)
const CreatomateResponseSchema = z.object({
  id: z.string().optional(),
  status: z.string().optional(),
  url: z.string().optional(), // URL to the rendered video if available immediately or upon completion
  error: z.string().nullable().optional(), // Captures error messages from Creatomate
  message: z.string().nullable().optional(), // Additional messages, often error details
  // Use passthrough to allow any other fields Creatomate might return
}).passthrough();


const ImagineExplainerOutputSchema = z.object({
  explanation: z.string().describe('The AI-generated simple, imaginative explanation of the topic.'),
  videoRenderJob: CreatomateResponseSchema.nullable().describe('The response from the Creatomate API regarding the video render job, or null if API call failed before response.'),
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
  prompt: `You are 'Imagine Explainer', an AI that explains complex topics in a super simple, imaginative, and friendly way, as if explaining to a curious child or someone with no prior knowledge. Make it engaging and easy to visualize. This explanation will be used in a short video.

Topic: {{{topic}}}

Please provide a simple explanation for the topic: "{{{topic}}}". This will be the main text in the video.
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
    let creatomateResponseData: z.infer<typeof CreatomateResponseSchema> | null = null;

    try {
      // 1. Generate text explanation using AI
      const { output: explanationOutput } = await explanationPrompt(input);
      if (!explanationOutput || typeof explanationOutput.explanation !== 'string') {
        console.error("imagineExplainerFlow: AI prompt returned undefined or malformed output for input:", input, "Output received:", explanationOutput);
        // Fallback explanation is already set as "Could not generate explanation."
      } else {
        aiExplanation = explanationOutput.explanation;
      }

      // 2. Prepare data for Creatomate API
      const creatomatePayload = {
        template_id: CREATOMATE_TEMPLATE_ID,
        modifications: {
          "Video.source": DEFAULT_VIDEO_SOURCE,
          "Text-1.text": aiExplanation, // Use AI generated explanation
          "Text-2.text": `Understanding: ${input.topic}`, // Use the topic as a secondary text
        },
      };

      // 3. Call Creatomate API
      console.log("Calling Creatomate API with payload:", JSON.stringify(creatomatePayload, null, 2));
      const response = await fetch(CREATOMATE_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CREATOMATE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(creatomatePayload)
      });

      // Attempt to parse JSON regardless of response.ok, as error details might be in the body
      try {
        creatomateResponseData = await response.json();
      } catch (jsonError) {
        // If JSON parsing fails, especially for non-OK responses with non-JSON bodies
        console.error("Creatomate API response JSON parsing error:", jsonError);
        if (!response.ok) {
            creatomateResponseData = { 
                error: `HTTP error ${response.status}`, 
                message: response.statusText || "Failed to render video and couldn't parse error response."
            };
        } else {
            // This case is less likely: OK response but non-JSON body.
             creatomateResponseData = { 
                error: "Invalid JSON response from Creatomate", 
                message: "Received a non-JSON response from Creatomate even with a success status."
            };
        }
      }
      console.log("Creatomate API Response Data:", creatomateResponseData);

      if (!response.ok) {
        console.error(`Creatomate API Error: ${response.status} ${response.statusText}`, creatomateResponseData);
        // Ensure creatomateResponseData (which might already have error details) reflects the HTTP error if not already set
        if (creatomateResponseData && !creatomateResponseData.error && !creatomateResponseData.message) {
             creatomateResponseData.error = `HTTP error ${response.status}`;
             creatomateResponseData.message = response.statusText || "Failed to render video with Creatomate.";
        } else if (!creatomateResponseData) { // Should have been caught by jsonError block, but as a fallback
             creatomateResponseData = { 
                error: `HTTP error ${response.status}`, 
                message: response.statusText || "Failed to render video with Creatomate."
            };
        }
      }

    } catch (e) {
      console.error("Error in imagineExplainerFlow execution:", e);
      // Ensure creatomateResponseData reflects this error if it happened during the flow, possibly before API call
      if (!creatomateResponseData) { // If error happened before Creatomate call or during it
          creatomateResponseData = { error: "Flow execution error", message: (e as Error).message };
      } else { // If error happened after Creatomate call, append to existing info if appropriate
          creatomateResponseData.error = creatomateResponseData.error ? `${creatomateResponseData.error}; Flow error: ${(e as Error).message}` : `Flow error: ${(e as Error).message}`;
      }
    }
    
    return {
      explanation: aiExplanation,
      videoRenderJob: creatomateResponseData,
    };
  }
);
