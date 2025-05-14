'use server';

/**
 * @fileOverview Generates concise revision notes from a textbook PDF.
 *
 * - generateStudySummary - A function that handles the generation of study summaries.
 * - GenerateStudySummaryInput - The input type for the generateStudySummary function.
 * - GenerateStudySummaryOutput - The return type for the generateStudySummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { geminiPro } from '@genkit-ai/googleai';

const GenerateStudySummaryInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A textbook PDF, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type GenerateStudySummaryInput = z.infer<typeof GenerateStudySummaryInputSchema>;

const GenerateStudySummaryOutputSchema = z.object({
  summary: z.string().describe('Concise revision notes generated from the textbook.'),
  progress: z.string().describe('Short progress summary of the flow.'),
});
export type GenerateStudySummaryOutput = z.infer<typeof GenerateStudySummaryOutputSchema>;

export async function generateStudySummary(input: GenerateStudySummaryInput): Promise<GenerateStudySummaryOutput> {
  return generateStudySummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStudySummaryPrompt',
  model: geminiPro,
  input: {schema: GenerateStudySummaryInputSchema},
  output: {schema: GenerateStudySummaryOutputSchema},
  prompt: `You are an expert tutor specializing in creating study notes from textbooks.

You will generate concise revision notes from the following textbook PDF.

PDF: {{media url=pdfDataUri}}

Ensure that the notes are comprehensive and cover the key concepts of the textbook.
`,
});

const generateStudySummaryFlow = ai.defineFlow(
  {
    name: 'generateStudySummaryFlow',
    inputSchema: GenerateStudySummaryInputSchema,
    outputSchema: GenerateStudySummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return {
      ...output!,
      progress: 'Generated concise revision notes from the textbook PDF.',
    };
  }
);