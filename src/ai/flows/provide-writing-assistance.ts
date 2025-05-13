
'use server';
/**
 * @fileOverview Provides AI-powered writing assistance for essays and reports.
 *
 * - provideWritingAssistance - A function that analyzes text for grammar, structure, and clarity.
 * - ProvideWritingAssistanceInput - The input type for the provideWritingAssistance function.
 * - ProvideWritingAssistanceOutput - The return type for the provideWritingAssistance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProvideWritingAssistanceInputSchema = z.object({
  text: z.string().describe('The text (essay, report, etc.) to be analyzed.'),
  assistanceType: z.enum(['grammar', 'structure', 'clarity', 'overall'])
    .describe('The specific type of assistance requested: grammar, structure, clarity, or overall feedback.')
    .default('overall'),
});
export type ProvideWritingAssistanceInput = z.infer<typeof ProvideWritingAssistanceInputSchema>;

const ProvideWritingAssistanceOutputSchema = z.object({
  feedback: z.string().describe('Constructive feedback on the provided text, focusing on the requested assistance type.'),
  suggestions: z.array(z.string()).describe('Specific suggestions for improvement.'),
});
export type ProvideWritingAssistanceOutput = z.infer<typeof ProvideWritingAssistanceOutputSchema>;

export async function provideWritingAssistance(input: ProvideWritingAssistanceInput): Promise<ProvideWritingAssistanceOutput> {
  return provideWritingAssistanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'provideWritingAssistancePrompt',
  input: {schema: ProvideWritingAssistanceInputSchema},
  output: {schema: ProvideWritingAssistanceOutputSchema},
  prompt: `You are an expert writing tutor. A student has submitted a piece of text and is looking for feedback.

Student's Text:
{{{text}}}

Assistance Requested: {{{assistanceType}}}

Please provide detailed and constructive feedback.
If 'overall' assistance is requested, address grammar, structure, and clarity.
Otherwise, focus specifically on the requested area.
Offer specific suggestions for improvement. Structure your response clearly with a general feedback section and a list of specific suggestions.
For example:
{
  "feedback": "Your essay has a strong introduction, but the arguments in the body paragraphs could be better supported with evidence. The conclusion effectively summarizes the main points. There are a few minor grammatical errors related to subject-verb agreement.",
  "suggestions": [
    "Consider adding specific examples or data to support your claims in paragraph 2.",
    "Review subject-verb agreement rules, particularly in sentences with compound subjects.",
    "Ensure each paragraph has a clear topic sentence that relates back to the main thesis."
  ]
}
`,
});

const provideWritingAssistanceFlow = ai.defineFlow(
  {
    name: 'provideWritingAssistanceFlow',
    inputSchema: ProvideWritingAssistanceInputSchema,
    outputSchema: ProvideWritingAssistanceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

