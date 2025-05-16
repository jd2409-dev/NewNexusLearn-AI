// src/app/api/magichour-webhook/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto'; // Needed for actual signature verification

// Attempt to get the webhook secret from environment variables
const MAGICHOUR_WEBHOOK_SECRET_ENV = process.env.MAGICHOUR_WEBHOOK_SECRET;
// Fallback to the hardcoded secret if the environment variable is not set
const MAGICHOUR_WEBHOOK_SECRET_FALLBACK = "mhw_live_5bFBd8w4MYAHRxPo9rKpzGTIDb4kjsg2";

let ACTUAL_WEBHOOK_SECRET: string;

if (MAGICHOUR_WEBHOOK_SECRET_ENV) {
  ACTUAL_WEBHOOK_SECRET = MAGICHOUR_WEBHOOK_SECRET_ENV;
  console.log("Magic Hour Webhook: Using webhook secret from environment variable.");
} else {
  console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.warn("!!! WARNING: MAGICHOUR_WEBHOOK_SECRET environment variable not set. !!!");
  console.warn("!!! Using fallback webhook secret. This is INSECURE for production. !!!");
  console.warn("!!! Please set MAGICHOUR_WEBHOOK_SECRET in your .env.local file or deployment environment. !!!");
  console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  ACTUAL_WEBHOOK_SECRET = MAGICHOUR_WEBHOOK_SECRET_FALLBACK;
}

/**
 * Placeholder for verifying the webhook signature from Magic Hour.
 * You MUST implement this function according to Magic Hour's webhook security documentation.
 *
 * @param request The incoming NextRequest object.
 * @param rawBody The raw request body as a string (needed for signature calculation).
 * @param secret The shared webhook secret.
 * @returns True if the signature is valid, false otherwise.
 */
async function verifyRequestSignature(request: NextRequest, rawBody: string, secret: string): Promise<boolean> {
  const signatureHeader = request.headers.get('X-MagicHour-Signature-256'); // Example header, replace with actual

  if (!signatureHeader) {
    console.warn("Magic Hour Webhook: Missing signature header (e.g., X-MagicHour-Signature-256).");
    return false;
  }

  // --- TODO: Implement actual signature verification logic here ---
  // This typically involves:
  // 1. Getting the timestamp or nonce from headers if Magic Hour includes them.
  // 2. Constructing the string to sign (e.g., timestamp + '.' + rawBody).
  // 3. Calculating the HMAC-SHA256 (or other algorithm Magic Hour uses) hash of that string using your secret.
  // 4. Comparing the calculated signature with the one from the header.
  //
  // Example (HMAC-SHA256, very simplified, LIKELY NEEDS ADJUSTMENT FOR MAGIC HOUR):
  // const calculatedSignature = crypto
  //   .createHmac('sha256', secret)
  //   .update(rawBody) // Or timestamp + rawBody, depending on Magic Hour's spec
  //   .digest('hex');
  //
  // if (calculatedSignature === signatureHeader) {
  //   return true;
  // } else {
  //   console.warn("Magic Hour Webhook: Signature mismatch.", { calculatedSignature, signatureHeader });
  //   return false;
  // }
  // --- End of TODO ---

  console.warn("Magic Hour Webhook: verifyRequestSignature is a placeholder and did not perform actual verification. Request will be allowed by default for now. IMPLEMENT PROPER VERIFICATION.");
  // For now, let's assume it's valid until actual logic is implemented.
  // In a real scenario, if the placeholder is active, you might want to return false by default for security.
  return true; // !! REPLACE THIS WITH ACTUAL VERIFICATION !!
}

export async function POST(request: NextRequest) {
  console.log("Magic Hour Webhook: Received a POST request");

  if (!ACTUAL_WEBHOOK_SECRET) {
    console.error("Magic Hour Webhook: CRITICAL - Webhook secret is not configured. Denying request.");
    return NextResponse.json({ error: "Webhook secret not configured on server." }, { status: 500 });
  }

  let rawBody;
  try {
    rawBody = await request.text(); // Get raw body for signature verification
  } catch (error) {
    console.error("Magic Hour Webhook: Error reading raw request body:", error);
    return NextResponse.json({ error: "Could not read request body" }, { status: 400 });
  }

  // Verify the request signature
  const isVerified = await verifyRequestSignature(request, rawBody, ACTUAL_WEBHOOK_SECRET);
  if (!isVerified) {
    console.warn("Magic Hour Webhook: Request signature verification failed. Denying request.");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 }); // 403 Forbidden
  }
  console.log("Magic Hour Webhook: Request signature verified (placeholder logic).");


  try {
    const body = JSON.parse(rawBody); // Parse JSON after raw body is used for signature
    console.log("Magic Hour Webhook: Request body:", JSON.stringify(body, null, 2));

    // --- TODO: Add your custom logic here to process the webhook data from Magic Hour ---
    // Example:
    // const { video_id, status, url /* other fields from Magic Hour */ } = body;
    // if (video_id && status === 'completed' && url) {
    //   console.log(`Magic Hour Webhook: Video ${video_id} processing complete. URL: ${url}`);
    //   // Example: await updateVideoStatusInFirestore(video_id, status, url);
    // } else if (video_id && (status === 'failed' || status === 'error')) {
    //   console.error(`Magic Hour Webhook: Video ${video_id} processing failed. Reason: ${body.error_message || 'Unknown'}`);
    // }
    // --- End of TODO ---

    return NextResponse.json({ message: "Magic Hour webhook received successfully" }, { status: 200 });
  } catch (error) {
    console.error("Magic Hour Webhook: Error processing JSON request body:", error);
    let errorMessage = "Invalid JSON payload or internal processing error.";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: "Error processing webhook", details: errorMessage }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  console.log("Magic Hour Webhook: Received a GET request (typically for verification/health check)");
  return NextResponse.json({ message: "Magic Hour webhook endpoint is active. Use POST to send event data." }, { status: 200 });
}
