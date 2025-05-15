
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Explicitly log about checking for API keys
console.log("Attempting to initialize Genkit in src/ai/genkit.ts...");
if (!process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY) {
    console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.warn("!!! WARNING: Neither GOOGLE_API_KEY nor GEMINI_API_KEY environment variable found. !!!");
    console.warn("!!! The googleAI() plugin for Genkit might fail to initialize without a valid API key. !!!");
    console.warn("!!! Please ensure one of these is set in your .env.local file or deployment environment. !!!");
    console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
} else {
    console.log("Found GOOGLE_API_KEY or GEMINI_API_KEY environment variable (or both).");
}


let aiInstance: any; // Using 'any' for now, ideally should be Genkit type

try {
  aiInstance = genkit({
    plugins: [
      googleAI(), // This plugin might require GOOGLE_API_KEY or a similar environment variable
    ],
  });
  console.log("Genkit initialized successfully in src/ai/genkit.ts.");
} catch (error) {
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.error("!!! CRITICAL ERROR INITIALIZING GENKIT in src/ai/genkit.ts !!!");
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.error("This is a common cause for 'Internal Server Error'.");
  console.error("Potential causes:");
  console.error("  1. Missing or invalid API key for the googleAI() plugin (e.g., GOOGLE_API_KEY, GEMINI_API_KEY).");
  console.error("     Ensure these are set correctly in your .env.local file or your deployment environment.");
  console.error("  2. Issues with Google Cloud project billing or API quotas being exceeded for the AI model.");
  console.error("  3. Misconfiguration of the googleAI() plugin itself.");
  console.error("  4. Issues with Genkit or @genkit-ai/googleai package versions or compatibility.");
  console.error("--------------------- Original Error Below ---------------------");
  console.error(error);
  console.error("--------------------------------------------------------------");
  // Rethrowing the error to ensure the server still reports a failure,
  // but now with more context logged above.
  throw new Error(`Genkit initialization failed: ${(error as Error).message}. THIS IS A SERVER-SIDE ERROR. CHECK YOUR SERVER LOGS AND ENSURE API KEYS (e.g., GOOGLE_API_KEY or GEMINI_API_KEY) ARE CORRECTLY SET IN YOUR ENVIRONMENT (e.g., .env.local file or deployment settings).`);
}

export const ai = aiInstance;
