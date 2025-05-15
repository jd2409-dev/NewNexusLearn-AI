
'use server';
console.log("Loading AI Flow: generate-quiz-reflection.ts");

/**
 * @fileOverview Generates AI-powered reflections and advice based on past quiz performance.
 *
 * - generateQuizReflection - A function that analyzes quiz questions and user answers to provide feedback.
 * - GenerateQuizReflectionInput - The input type for the generateQuizReflection function.
 * - GenerateQuizReflectionOutput - The return type for the generateQuizReflection function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { gemini15Flash } from '@genkit-ai/googleai';
import type { PastQuizQuestionDetail as PastQuizQuestionDetailType } from '@/lib/user-service';
import type { QuestionType } from '@/ai/flows/generate-interactive-quiz';


const PastQuizQuestionDetailSchema = z.object({
  questionText: z.string(),
  userAnswer: z.string(),
  correctAnswer: z.string(),
  options: z.array(z.string()),
  isCorrect: z.boolean(),
  questionType: z.custom<QuestionType>().describe('The type of the question (e.g., mcq, trueFalse).'),
});

const GenerateQuizReflectionInputSchema = z.object({
  quizName: z.string().describe('The name or topic of the quiz.'),
  questions: z.array(PastQuizQuestionDetailSchema).describe('An array of questions from the quiz, including user answers, correctness and type.'),
  difficultyLevel: z.enum(['easy', 'medium', 'hard']).optional().describe('The difficulty level of the quiz.'),
});
export type GenerateQuizReflectionInput = z.infer<typeof GenerateQuizReflectionInputSchema>;

const GenerateQuizReflectionOutputSchema = z.object({
  reflectionText: z.string().describe('AI-generated advice and reflection on the quiz performance, focusing on areas for improvement.'),
  identifiedWeaknesses: z.array(z.string()).optional().describe('A list of specific topics or concepts where the user struggled.'),
});
export type GenerateQuizReflectionOutput = z.infer<typeof GenerateQuizReflectionOutputSchema>;

export async function generateQuizReflection(input: GenerateQuizReflectionInput): Promise<GenerateQuizReflectionOutput> {
  return generateQuizReflectionFlow(input);
}

// Helper to format only incorrect questions for the prompt
const formatIncorrectQuestions = (questions: PastQuizQuestionDetailType[]): string => {
  let incorrectFormatted = "";
  const incorrectQuestions = questions.filter(q => !q.isCorrect);

  if (incorrectQuestions.length === 0) {
    return "The student answered all questions correctly in this quiz!";
  }

  incorrectQuestions.forEach(q => {
    incorrectFormatted += `Type: ${q.questionType}\nQuestion: ${q.questionText}\nYour Answer: ${q.userAnswer}\nCorrect Answer: ${q.correctAnswer}\n\n`;
  });
  return incorrectFormatted.trim();
};


const prompt = ai.definePrompt({
  name: 'generateQuizReflectionPrompt',
  model: gemini15Flash,
  input: {schema: GenerateQuizReflectionInputSchema},
  output: {schema: GenerateQuizReflectionOutputSchema},
  prompt: `You are an expert AI study coach. A student has completed a quiz titled "{{quizName}}"{{#if difficultyLevel}} with a difficulty of "{{difficultyLevel}}"{{/if}}.
Please analyze their performance on the questions they answered incorrectly and provide constructive feedback.

Here are the details of the questions the student got wrong:
{{{formatIncorrectQuestions questions}}}

Based on these incorrect answers:
1. Identify any patterns in the mistakes (e.g., misunderstanding of specific concepts, calculation errors, misinterpretation of questions, issues with certain question types).
2. Provide actionable advice and strategies on how to avoid these types of errors in the future.
3. Suggest specific areas or topics they might need to review based on their performance.
4. Keep the tone encouraging, supportive, and helpful. Focus on learning and improvement.

Please structure your response to include a general reflection and a list of identified weaknesses/topics to review if applicable.
Example output format:
{
  "reflectionText": "Great effort on the '{{quizName}}' quiz! It's a good opportunity to review a few areas. I noticed a pattern in [describe pattern, e.g., confusing term A with term B, or struggling with 'fillInTheBlanks' questions related to definitions]. To improve, try [specific strategy, e.g., creating flashcards for these terms or working through more examples of concept X]. For future quizzes, remember to [general advice, e.g., read each question carefully before answering]. Keep up the hard work!",
  "identifiedWeaknesses": ["Concept X", "Term A vs Term B", "Understanding definitions for fill-in-the-blanks"]
}
If all questions were answered correctly, the reflectionText should congratulate the student and state that no weaknesses were identified.
`,
  helpers: {
    formatIncorrectQuestions: formatIncorrectQuestions
  }
});

const generateQuizReflectionFlow = ai.defineFlow(
  {
    name: 'generateQuizReflectionFlow',
    inputSchema: GenerateQuizReflectionInputSchema,
    outputSchema: GenerateQuizReflectionOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await prompt(input);
      if (!output || typeof output.reflectionText !== 'string') {
          console.error("generateQuizReflectionFlow: Prompt returned undefined or malformed output for input:", input, "Output received:", output);
          throw new Error("AI model failed to generate quiz reflection. Output was undefined or malformed.");
      }
      // Ensure identifiedWeaknesses is an array if present, or default to empty array
      output.identifiedWeaknesses = Array.isArray(output.identifiedWeaknesses) ? output.identifiedWeaknesses : [];
      return output;
    } catch (e) {
      console.error("Error in generateQuizReflectionFlow with input:", input, "Error:", e);
      throw new Error(`Failed to generate quiz reflection: ${(e as Error).message}`);
    }
  }
);
