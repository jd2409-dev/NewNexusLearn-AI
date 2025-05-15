
'use server';
console.log("Loading AI Flow: provide-ai-study-coaching.ts");

/**
 * @fileOverview An AI study coach that provides step-by-step explanations.
 *
 * - provideAiStudyCoaching - A function that provides step-by-step explanations for a given problem.
 * - ProvideAiStudyCoachingInput - The input type for the provideAiStudyCoaching function.
 * - ProvideAiStudyCoachingOutput - The return type for the provideAiStudyCoaching function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { gemini15Flash } from '@genkit-ai/googleai';

const ProvideAiStudyCoachingInputSchema = z.object({
  problem: z.string().describe('The problem the student is stuck on.'),
  studentLevel: z.string().describe('The student\u2019s current academic level (e.g., CBSE, ICSE, GCSE, IB, state boards).'),
});
export type ProvideAiStudyCoachingInput = z.infer<typeof ProvideAiStudyCoachingInputSchema>;

const ProvideAiStudyCoachingOutputSchema = z.object({
  explanation: z.string().describe('A step-by-step explanation of the problem.'),
});
export type ProvideAiStudyCoachingOutput = z.infer<typeof ProvideAiStudyCoachingOutputSchema>;

export async function provideAiStudyCoaching(input: ProvideAiStudyCoachingInput): Promise<ProvideAiStudyCoachingOutput> {
  return provideAiStudyCoachingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'provideAiStudyCoachingPrompt',
  model: gemini15Flash,
  input: {schema: ProvideAiStudyCoachingInputSchema},
  output: {schema: ProvideAiStudyCoachingOutputSchema},
  prompt: `You are an AI study coach that provides step-by-step explanations to students who are stuck on a problem.

  The student is currently studying at the {{{studentLevel}}} level.

  Provide a step-by-step explanation for the following problem:
  {{problem}}`,
});

const provideAiStudyCoachingFlow = ai.defineFlow(
  {
    name: 'provideAiStudyCoachingFlow',
    inputSchema: ProvideAiStudyCoachingInputSchema,
    outputSchema: ProvideAiStudyCoachingOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      if (!output || typeof output.explanation !== 'string') {
        console.error("provideAiStudyCoachingFlow: Prompt returned undefined or malformed output for input:", input, "Output received:", output);
        throw new Error("AI model failed to provide study coaching. Output was undefined or malformed.");
      }
      return output;
    } catch (e) {
      console.error("Error in provideAiStudyCoachingFlow with input:", input, "Error:", e);
      throw new Error(`Failed to provide AI study coaching: ${(e as Error).message}`);
    }
  }
);
