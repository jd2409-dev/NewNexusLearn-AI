
'use server';
console.log("Loading AI Flow: imagine-explainer-flow.ts");

/**
 * @fileOverview Provides simple, imaginative explanations for complex topics.
 *
 * - imagineExplainer - A function that generates a simple explanation and an image suggestion.
 * - ImagineExplainerInput - The input type for the imagineExplainer function.
 * - ImagineExplainerOutput - The return type for the imagineExplainer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { gemini15Flash } from '@genkit-ai/googleai';

const ImagineExplainerInputSchema = z.object({
  topic: z.string().describe('The complex topic to be explained simply.'),
});
export type ImagineExplainerInput = z.infer<typeof ImagineExplainerInputSchema>;

const ImagineExplainerOutputSchema = z.object({
  explanation: z.string().describe('A simple, imaginative explanation of the topic.'),
  imageSuggestion: z.string().describe('A suggestion for a simple, imaginative image that could accompany this explanation.'),
});
export type ImagineExplainerOutput = z.infer<typeof ImagineExplainerOutputSchema>;

export async function imagineExplainer(input: ImagineExplainerInput): Promise<ImagineExplainerOutput> {
  return imagineExplainerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'imagineExplainerPrompt',
  model: gemini15Flash,
  input: {schema: ImagineExplainerInputSchema},
  output: {schema: ImagineExplainerOutputSchema},
  prompt: `You are 'Imagine Explainer', an AI that explains complex topics in a super simple, imaginative, and friendly way, as if explaining to a curious child or someone with no prior knowledge. Make it engaging and easy to visualize.

Topic: {{{topic}}}

Please provide:
1. A simple explanation for the topic: "{{{topic}}}".
2. A brief suggestion for a simple, imaginative image that could visually represent this explanation.

Example of expected output format:
{
  "explanation": "Imagine black holes are like super-duper hungry vacuum cleaners in space, but way, way stronger! They suck in everything, even light, and nothing can escape once it gets too close. They're so strong because a whole lot of stuff is squeezed into a tiny, tiny spot.",
  "imageSuggestion": "A friendly cartoon vacuum cleaner in space with stars and planets swirling towards its nozzle, but it has a slightly mischievous, hungry smile. One tiny beam of light is bent as it tries to escape."
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
    try {
      const {output} = await prompt(input);
      if (!output || typeof output.explanation !== 'string' || typeof output.imageSuggestion !== 'string') {
        console.error("imagineExplainerFlow: Prompt returned undefined or malformed output for input:", input, "Output received:", output);
        throw new Error("AI model failed to provide an explanation. Output was undefined or malformed.");
      }
      return output;
    } catch (e) {
      console.error("Error in imagineExplainerFlow with input:", input, "Error:", e);
      throw new Error(`Failed to generate explanation: ${(e as Error).message}`);
    }
  }
);
