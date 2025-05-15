// src/ai/flows/generate-interactive-quiz.ts
'use server';

/**
 * @fileOverview Generates interactive quiz questions from uploaded PDF content,
 * supporting different difficulty levels and question types.
 *
 * - generateInteractiveQuiz - A function that generates quiz questions.
 * - GenerateInteractiveQuizInput - The input type.
 * - GenerateInteractiveQuizOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { gemini15Flash } from '@genkit-ai/googleai';

const QuestionTypeEnum = z.enum(['mcq', 'trueFalse', 'fillInTheBlanks', 'shortAnswer']);
export type QuestionType = z.infer<typeof QuestionTypeEnum>;

const GenerateInteractiveQuizInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      'A PDF document as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
  numberOfQuestions: z
    .number()
    .min(1)
    .max(20)
    .default(5)
    .describe('The number of quiz questions to generate.'),
  difficultyLevel: z.enum(['easy', 'medium', 'hard']).default('medium').optional()
    .describe('The desired difficulty level of the quiz.'),
  questionTypes: z.array(QuestionTypeEnum).default(['mcq']).optional()
    .describe('The desired types of questions. If not provided, AI will default to MCQs or a mix.'),
});

export type GenerateInteractiveQuizInput = z.infer<typeof GenerateInteractiveQuizInputSchema>;

const QuizQuestionSchema = z.object({
  type: QuestionTypeEnum.describe('The type of the question.'),
  question: z.string().describe('The quiz question. For fillInTheBlanks, use "____" or a similar placeholder for the blank space.'),
  answer: z.string().describe('The correct answer. For trueFalse, this will be "True" or "False". For fillInTheBlanks, this is the word/phrase for the blank.'),
  options: z.array(z.string()).optional().describe('Possible answer options. Required for mcq (typically 4 options). For trueFalse, this should be ["True", "False"]. Not used for fillInTheBlanks or shortAnswer.'),
});

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

const GenerateInteractiveQuizOutputSchema = z.object({
  questions: z.array(QuizQuestionSchema),
});

export type GenerateInteractiveQuizOutput = z.infer<typeof GenerateInteractiveQuizOutputSchema>;

export async function generateInteractiveQuiz(input: GenerateInteractiveQuizInput): Promise<GenerateInteractiveQuizOutput> {
  return generateInteractiveQuizFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInteractiveQuizPrompt',
  model: gemini15Flash,
  input: {schema: GenerateInteractiveQuizInputSchema},
  output: {schema: GenerateInteractiveQuizOutputSchema},
  prompt: `You are an expert educator specializing in creating quizzes.

  You will generate {{numberOfQuestions}} quiz questions based on the content of the following PDF document.
  The difficulty level for the questions should be: {{difficultyLevel}}.
  The types of questions to generate should be from the following list: {{#if questionTypes}}{{#each questionTypes}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}mcq{{/if}}.
  If multiple question types are specified, try to include a mix. If only one is specified, generate all questions of that type.

  The questions should test the student's understanding of the material.

  PDF Content: {{media url=pdfDataUri}}

  The output must be a JSON object with a 'questions' field. Each question object in the array must have:
  1.  "type": One of "mcq", "trueFalse", "fillInTheBlanks", "shortAnswer".
  2.  "question": The question text. For "fillInTheBlanks", use a placeholder like "____" for the blank.
  3.  "answer": The correct answer.
      - For "mcq", "fillInTheBlanks", "shortAnswer": The correct string answer.
      - For "trueFalse": Must be "True" or "False".
  4.  "options": An array of strings.
      - For "mcq": Provide 4 plausible options, one of which is the correct answer.
      - For "trueFalse": This field MUST be ["True", "False"].
      - For "fillInTheBlanks" and "shortAnswer": This field can be omitted or be an empty array.

  Example JSON output format:
  {
    "questions": [
      {
        "type": "mcq",
        "question": "What is the capital of France?",
        "options": ["Paris", "London", "Berlin", "Rome"],
        "answer": "Paris"
      },
      {
        "type": "trueFalse",
        "question": "The Earth is flat.",
        "options": ["True", "False"],
        "answer": "False"
      },
      {
        "type": "fillInTheBlanks",
        "question": "The chemical symbol for water is ____.",
        "answer": "H2O"
      },
      {
        "type": "shortAnswer",
        "question": "Briefly explain the process of photosynthesis.",
        "answer": "Photosynthesis is the process used by plants, algae, and some bacteria to convert light energy into chemical energy, through a process that uses sunlight, water, and carbon dioxide."
      }
    ]
  }
  Ensure the number of questions generated matches the requested {{numberOfQuestions}}.
  For MCQs, ensure there are exactly 4 options.
  For True/False, ensure options are ["True", "False"].
  `,
});

const generateInteractiveQuizFlow = ai.defineFlow(
  {
    name: 'generateInteractiveQuizFlow',
    inputSchema: GenerateInteractiveQuizInputSchema,
    outputSchema: GenerateInteractiveQuizOutputSchema,
  },
  async (input) => {
    try {
      // Ensure default questionTypes if empty array is somehow passed
      if (!input.questionTypes || input.questionTypes.length === 0) {
        input.questionTypes = ['mcq'];
      }
      const {output} = await prompt(input);

      if (!output || !output.questions) {
        console.error("generateInteractiveQuizFlow: Prompt returned undefined output or no questions for input:", input, "Output received:", output);
        throw new Error("AI model failed to generate quiz questions. Output was undefined or malformed.");
      }

      // Validate output, especially for MCQs and True/False options
      output.questions.forEach(q => {
        if (q.type === 'mcq' && (!q.options || q.options.length !== 4)) {
          // console.warn("MCQ question does not have 4 options:", q);
          // Potentially add more robust fixing logic here if needed, or rely on prompt adherence
        }
        if (q.type === 'trueFalse' && (!q.options || q.options.length !== 2 || !q.options.includes("True") || !q.options.includes("False"))) {
          // console.warn("True/False question does not have correct options:", q);
          q.options = ["True", "False"]; // Force correct options
        }
      });
      return output;
    } catch (e) {
      console.error("Error in generateInteractiveQuizFlow with input:", input, "Error:", e);
      throw new Error(`Failed to generate interactive quiz: ${(e as Error).message}`);
    }
  }
);
