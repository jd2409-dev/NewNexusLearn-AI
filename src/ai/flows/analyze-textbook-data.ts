// This file analyzes textbook data and finds direct answers within the textbook when asked a question.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { gemini15Flash } from '@genkit-ai/googleai'; // Changed from gemini15Pro

const AnalyzeTextbookDataInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A textbook PDF, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  question: z.string().describe('The question to find the answer to in the textbook.'),
});
export type AnalyzeTextbookDataInput = z.infer<typeof AnalyzeTextbookDataInputSchema>;

const AnalyzeTextbookDataOutputSchema = z.object({
  answer: z.string().describe('The direct answer to the question found within the textbook.'),
  pageReferences: z.string().describe('The page numbers where the answer was found.'),
});
export type AnalyzeTextbookDataOutput = z.infer<typeof AnalyzeTextbookDataOutputSchema>;

export async function analyzeTextbookData(input: AnalyzeTextbookDataInput): Promise<AnalyzeTextbookDataOutput> {
  return analyzeTextbookDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeTextbookDataPrompt',
  model: gemini15Flash, // Changed from gemini15Pro
  input: {schema: AnalyzeTextbookDataInputSchema},
  output: {schema: AnalyzeTextbookDataOutputSchema},
  prompt: `You are an expert at extracting information from textbooks. A student will provide you with a textbook and a question.  You will respond with the direct answer to the question found within the textbook, and the page numbers where the answer was found.

Textbook: {{media url=pdfDataUri}}
Question: {{{question}}}`,
});

const analyzeTextbookDataFlow = ai.defineFlow(
  {
    name: 'analyzeTextbookDataFlow',
    inputSchema: AnalyzeTextbookDataInputSchema,
    outputSchema: AnalyzeTextbookDataOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
