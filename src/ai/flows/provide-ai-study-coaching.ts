'use server';

/**
 * @fileOverview An AI study coach that provides step-by-step explanations.
 *
 * - provideAiStudyCoaching - A function that provides step-by-step explanations for a given problem.
 * - ProvideAiStudyCoachingInput - The input type for the provideAiStudyCoaching function.
 * - ProvideAiStudyCoachingOutput - The return type for the provideAiStudyCoaching function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { gemini15Pro } from '@genkit-ai/googleai';

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
  model: gemini15Pro,
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
    const {output} = await prompt(input);
    return output!;
  }
);
