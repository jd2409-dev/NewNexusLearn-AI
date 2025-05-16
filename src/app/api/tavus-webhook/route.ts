// src/app/api/tavus-webhook/route.ts
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log("Tavus Webhook: Received a POST request");

  try {
    const body = await request.json();
    console.log("Tavus Webhook: Request body:", JSON.stringify(body, null, 2));

    // --- TODO: Add your custom logic here to process the webhook data from Tavus ---
    // For example, if Tavus sends video completion status:
    // 1. Verify the request's authenticity (e.g., using a signature or shared secret if Tavus provides one).
    // 2. Extract relevant data like video_id, status, video_url from the 'body'.
    //    const { video_id, status, url /* other fields from Tavus */ } = body;
    // 3. Update your database (e.g., Firestore) with this information.
    //    if (video_id && status === 'complete' && url) {
    //      console.log(`Video ${video_id} processing complete. URL: ${url}`);
    //      // Example: await updateVideoStatusInFirestore(video_id, status, url);
    //    } else if (video_id && status === 'failed') {
    //      // Handle failed video processing
    //      console.error(`Video ${video_id} processing failed. Reason: ${body.error_message || 'Unknown'}`);
    //    }
    // --- End of TODO ---

    return NextResponse.json({ message: "Webhook received successfully" }, { status: 200 });
  } catch (error) {
    console.error("Tavus Webhook: Error processing request:", error);
    let errorMessage = "Invalid JSON payload or internal processing error.";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    // It's good practice to return a 4xx error if the client sent bad data,
    // or a 5xx if it's your server's fault.
    // For simplicity, returning 400 for client-related parsing errors.
    return NextResponse.json({ error: "Error processing webhook", details: errorMessage }, { status: 400 });
  }
}

// Optional: Handler for GET requests if needed for verification by some webhook providers
export async function GET(request: NextRequest) {
  console.log("Tavus Webhook: Received a GET request (typically for verification)");
  // Some services use a GET request with a challenge parameter for initial webhook setup.
  // You might need to handle that here if Tavus requires it.
  return NextResponse.json({ message: "Webhook endpoint is active. Use POST to send event data." }, { status: 200 });
}
