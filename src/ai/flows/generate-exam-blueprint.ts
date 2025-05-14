// use server'

/**
 * @fileOverview AI-powered study plan blueprint generation based on high-weightage topics.
 *
 * - generateExamBlueprint - A function that generates a study plan blueprint.
 * - GenerateExamBlueprintInput - The input type for the generateExamBlueprint function.
 * - GenerateExamBlueprintOutput - The return type for the generateExamBlueprint function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { geminiPro } from '@genkit-ai/googleai';

const GenerateExamBlueprintInputSchema = z.object({
  board: z.string().describe('The school board (e.g., CBSE, ICSE, GCSE, IB, state boards).'),
  subject: z.string().describe('The subject for which the exam blueprint is needed (e.g., Mathematics, Science, English).'),
  topics: z.string().describe('A comma-separated list of topics to be included in the exam blueprint.'),
  examType: z.string().describe('The type of exam (e.g., final exam, midterm, unit test).'),
  difficultyLevel: z.string().describe('The desired difficulty level of the exam blueprint (e.g., easy, medium, hard).'),
});
export type GenerateExamBlueprintInput = z.infer<typeof GenerateExamBlueprintInputSchema>;

const GenerateExamBlueprintOutputSchema = z.object({
  blueprint: z.string().describe('The generated exam blueprint, including topic weightage and suggested study time.'),
});
export type GenerateExamBlueprintOutput = z.infer<typeof GenerateExamBlueprintOutputSchema>;

export async function generateExamBlueprint(input: GenerateExamBlueprintInput): Promise<GenerateExamBlueprintOutput> {
  return generateExamBlueprintFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateExamBlueprintPrompt',
  model: geminiPro,
  input: {schema: GenerateExamBlueprintInputSchema},
  output: {schema: GenerateExamBlueprintOutputSchema},
  prompt: `You are an expert in creating exam blueprints for various school boards and subjects. Based on the provided information, create a detailed study plan blueprint.

School Board: {{{board}}}
Subject: {{{subject}}}
Topics: {{{topics}}}
Exam Type: {{{examType}}}
Difficulty Level: {{{difficultyLevel}}}

Consider high-weightage topics and suggest an appropriate study time allocation for each topic. The blueprint should be easy to follow and optimized for effective exam preparation.

Output the exam blueprint in a structured format.`,
});

const generateExamBlueprintFlow = ai.defineFlow(
  {
    name: 'generateExamBlueprintFlow',
    inputSchema: GenerateExamBlueprintInputSchema,
    outputSchema: GenerateExamBlueprintOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      if (!output) {
        console.error("generateExamBlueprintFlow: Prompt returned undefined output for input:", input);
        throw new Error("AI model failed to generate a blueprint. Output was undefined.");
      }
      return output;
    } catch (e) {
      console.error("Error in generateExamBlueprintFlow with input:", input, "Error:", e);
      // Re-throw the error so it's still treated as a failure by Genkit/Next.js,
      // but we've logged it more specifically here.
      throw new Error(`Failed to generate exam blueprint: ${(e as Error).message}`);
    }
  }
);