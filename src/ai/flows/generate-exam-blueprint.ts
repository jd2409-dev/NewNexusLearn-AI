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
    const {output} = await prompt(input);
    return output!;
  }
);
