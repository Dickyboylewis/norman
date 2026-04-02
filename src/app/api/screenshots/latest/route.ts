import fs from "fs";
import os from "os";
import path from "path";

const SCREENSHOT_PATH = path.join(os.tmpdir(), "prospecting-latest.png");

/**
 * API Route: GET /api/screenshots/latest
 * 
 * Serves the latest prospecting screenshot image
 * Used by Slack to display the embedded image
 */
export async function GET() {
  try {
    // Path to the latest screenshot

    // Check if file exists
    if (!fs.existsSync(SCREENSHOT_PATH)) {
      return new Response("No screenshot available", { status: 404 });
    }

    // Read the screenshot file
    const buffer = fs.readFileSync(SCREENSHOT_PATH);

    // Return the image with appropriate headers
    return new Response(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error serving screenshot:", error);
    return new Response("Error loading screenshot", { status: 500 });
  }
}
