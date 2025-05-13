
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-exam-blueprint.ts';
import '@/ai/flows/generate-interactive-quiz.ts';
import '@/ai/flows/generate-study-summary.ts';
import '@/ai/flows/provide-ai-study-coaching.ts';
import '@/ai/flows/analyze-textbook-data.ts';
import '@/ai/flows/provide-writing-assistance.ts'; // Added new flow
