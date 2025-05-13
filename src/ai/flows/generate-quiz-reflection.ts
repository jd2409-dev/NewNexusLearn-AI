
'use server';
/**
 * @fileOverview Generates AI-powered reflections and advice based on past quiz performance.
 *
 * - generateQuizReflection - A function that analyzes quiz questions and user answers to provide feedback.
 * - GenerateQuizReflectionInput - The input type for the generateQuizReflection function.
 * - GenerateQuizReflectionOutput - The return type for the generateQuizReflection function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { PastQuizQuestionDetail } from '@/lib/user-service'; // Assuming type is exported

const PastQuizQuestionDetailSchema = z.object({
  questionText: z.string(),
  userAnswer: z.string(),
  correctAnswer: z.string(),
  options: z.array(z.string()),
  isCorrect: z.boolean(),
});

const GenerateQuizReflectionInputSchema = z.object({
  quizName: z.string().describe('The name or topic of the quiz.'),
  questions: z.array(PastQuizQuestionDetailSchema).describe('An array of questions from the quiz, including user answers and correctness.'),
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
const formatIncorrectQuestions = (questions: PastQuizQuestionDetail[]): string => {
  let incorrectFormatted = "";
  const incorrectQuestions = questions.filter(q => !q.isCorrect);

  if (incorrectQuestions.length === 0) {
    return "The student answered all questions correctly in this quiz!";
  }

  incorrectQuestions.forEach(q => {
    incorrectFormatted += `Question: ${q.questionText}\nYour Answer: ${q.userAnswer}\nCorrect Answer: ${q.correctAnswer}\n\n`;
  });
  return incorrectFormatted.trim();
};


const prompt = ai.definePrompt({
  name: 'generateQuizReflectionPrompt',
  input: {schema: GenerateQuizReflectionInputSchema},
  output: {schema: GenerateQuizReflectionOutputSchema},
  prompt: `You are an expert AI study coach. A student has completed a quiz titled "{{quizName}}".
Please analyze their performance on the questions they answered incorrectly and provide constructive feedback.

Here are the details of the questions the student got wrong:
{{{formatIncorrectQuestions questions}}}

Based on these incorrect answers:
1. Identify any patterns in the mistakes (e.g., misunderstanding of specific concepts, calculation errors, misinterpretation of questions).
2. Provide actionable advice and strategies on how to avoid these types of errors in the future.
3. Suggest specific areas or topics they might need to review based on their performance.
4. Keep the tone encouraging, supportive, and helpful. Focus on learning and improvement.

Please structure your response to include a general reflection and a list of identified weaknesses/topics to review if applicable.
Example output format:
{
  "reflectionText": "Great effort on the '{{quizName}}' quiz! It's a good opportunity to review a few areas. I noticed a pattern in [describe pattern, e.g., confusing term A with term B]. To improve, try [specific strategy, e.g., creating flashcards for these terms or working through more examples of concept X]. For future quizzes, remember to [general advice, e.g., read each question carefully before answering]. Keep up the hard work!",
  "identifiedWeaknesses": ["Concept X", "Term A vs Term B"]
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
    const { output } = await prompt(input);
    if (!output) {
        // Handle cases where the AI might not return a structured output as expected,
        // though Zod validation should catch this.
        // This flow is robust enough that if all questions are correct, the prompt handles it.
        return {
            reflectionText: "Could not generate reflection at this time. Please try again later.",
            identifiedWeaknesses: []
        };
    }
    return output;
  }
);
