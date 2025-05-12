// src/ai/flows/generate-interactive-quiz.ts
'use server';

/**
 * @fileOverview Generates interactive quiz questions from uploaded PDF content.
 *
 * - generateInteractiveQuiz - A function that generates quiz questions from PDF content.
 * - GenerateInteractiveQuizInput - The input type for the generateInteractiveQuiz function.
 * - GenerateInteractiveQuizOutput - The return type for the generateInteractiveQuiz function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInteractiveQuizInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      'A PDF document as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
  numberOfQuestions: z
    .number()
    .default(5)
    .describe('The number of quiz questions to generate.'),
});

export type GenerateInteractiveQuizInput = z.infer<typeof GenerateInteractiveQuizInputSchema>;

const GenerateInteractiveQuizOutputSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string().describe('The quiz question.'),
      answer: z.string().describe('The correct answer to the question.'),
      options: z.array(z.string()).describe('The possible answer options.'),
    })
  ),
});

export type GenerateInteractiveQuizOutput = z.infer<typeof GenerateInteractiveQuizOutputSchema>;

export async function generateInteractiveQuiz(input: GenerateInteractiveQuizInput): Promise<GenerateInteractiveQuizOutput> {
  return generateInteractiveQuizFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInteractiveQuizPrompt',
  input: {schema: GenerateInteractiveQuizInputSchema},
  output: {schema: GenerateInteractiveQuizOutputSchema},
  prompt: `You are an expert educator specializing in creating quizzes.

  You will generate {{numberOfQuestions}} quiz questions based on the content of the following PDF document.

  The questions should test the student's understanding of the material.

  PDF Content: {{media url=pdfDataUri}}

  The output should be a JSON object with a 'questions' field. Each question should have a 'question', 'answer', and 'options' field. There must be 4 options, one of which must be the correct answer.
  The options should be plausible, but only one should be correct.
  Here's an example of the desired JSON format:
  {
    "questions": [
      {
        "question": "What is the capital of France?",
        "answer": "Paris",
        "options": ["Paris", "London", "Berlin", "Rome"]
      },
      {
        "question": "What is the highest mountain in the world?",
        "answer": "Mount Everest",
        "options": ["Mount Everest", "K2", "Kangchenjunga", "Lhotse"]
      }
    ]
  }`,
});

const generateInteractiveQuizFlow = ai.defineFlow(
  {
    name: 'generateInteractiveQuizFlow',
    inputSchema: GenerateInteractiveQuizInputSchema,
    outputSchema: GenerateInteractiveQuizOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
