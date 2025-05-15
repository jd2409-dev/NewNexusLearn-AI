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
import { gemini15Flash } from '@genkit-ai/googleai';

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
  // progress field is part of the final return, not the direct AI output schema
});
export type GenerateStudySummaryOutput = { // Adjusted type for the wrapper function
    summary: string;
    progress: string;
};

const PromptOutputSchema = z.object({ // Schema for what the AI model itself returns
  summary: z.string().describe('Concise revision notes generated from the textbook.'),
});


export async function generateStudySummary(input: GenerateStudySummaryInput): Promise<GenerateStudySummaryOutput> {
  return generateStudySummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStudySummaryPrompt',
  model: gemini15Flash,
  input: {schema: GenerateStudySummaryInputSchema},
  output: {schema: PromptOutputSchema}, // Use the schema for AI model's direct output
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
    outputSchema: GenerateStudySummaryOutputSchema, // This is the schema for the flow's final output
  },
  async input => {
    try {
      const {output: promptOutput} = await prompt(input); // promptOutput matches PromptOutputSchema
      if (!promptOutput || typeof promptOutput.summary !== 'string') {
        console.error("generateStudySummaryFlow: Prompt returned undefined or malformed output for input:", input, "Output received:", promptOutput);
        throw new Error("AI model failed to generate a study summary. Output was undefined or malformed.");
      }
      return {
        summary: promptOutput.summary,
        progress: 'Generated concise revision notes from the textbook PDF.',
      };
    } catch (e) {
      console.error("Error in generateStudySummaryFlow with input:", input, "Error:", e);
      throw new Error(`Failed to generate study summary: ${(e as Error).message}`);
    }
  }
);
