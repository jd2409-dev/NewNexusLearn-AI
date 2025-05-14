
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

let aiInstance: any; // Using 'any' for now, ideally should be Genkit type

try {
  aiInstance = genkit({
    plugins: [
      googleAI(), // This plugin might require GOOGLE_API_KEY or a similar environment variable
    ],
    // The 'model' option is not a standard top-level configuration for genkit() itself.
    // It's typically specified in ai.generate() calls or when defining a model explicitly.
    // model: 'googleai/gemini-2.0-flash', // Removed from here
  });
  console.log("Genkit initialized successfully in src/ai/genkit.ts.");
} catch (error) {
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.error("!!! CRITICAL ERROR INITIALIZING GENKIT in src/ai/genkit.ts !!!");
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.error("This is a common cause for 'Internal Server Error'.");
  console.error("Potential causes:");
  console.error("  1. Missing environment variables for the googleAI() plugin (e.g., GOOGLE_API_KEY, GEMINI_API_KEY).");
  console.error("     Ensure these are set in your .env.local file or your deployment environment.");
  console.error("  2. Misconfiguration of the googleAI() plugin itself.");
  console.error("  3. Issues with Genkit or @genkit-ai/googleai package versions or compatibility.");
  console.error("--------------------- Original Error Below ---------------------");
  console.error(error);
  console.error("--------------------------------------------------------------");
  // Rethrowing the error to ensure the server still reports a failure,
  // but now with more context logged above.
  throw new Error(`Genkit initialization failed: ${(error as Error).message}. Check server logs for details.`);
}

export const ai = aiInstance;
