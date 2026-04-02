import fs from "fs";
import os from "os";
import path from "path";
import puppeteer from "puppeteer";
import { getWeeklyQuote } from "@/lib/motivational-quotes";

const SCREENSHOT_PATH = path.join(os.tmpdir(), "prospecting-latest.png");

/**
 * API Route: GET /api/send-prospecting
 * 
 * Screenshots the prospecting page and sends it to WhatsApp (GREEN-API) and Slack
 * 
 * Query params:
 * - secret: Required authentication (norman-send-2026)
 * - type: Optional message type (midweek|final), auto-detects based on day if not provided
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // STEP 1: Security check
    const secret = searchParams.get("secret");
    if (secret !== "norman-send-2026") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // STEP 2: Determine message type (midweek or final)
    let messageType = searchParams.get("type") as "midweek" | "final" | null;
    
    if (!messageType) {
      // Auto-detect based on current day
      const currentDay = new Date().getDay(); // 0 = Sunday, 3 = Wednesday, 5 = Friday
      if (currentDay === 5) {
        messageType = "final";
      } else if (currentDay === 3) {
        messageType = "midweek";
      } else {
        // Default to midweek if neither Wednesday nor Friday
        messageType = "midweek";
      }
    }

    // STEP 3: Take screenshot using Puppeteer
    console.log("Launching browser...");
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width: 1200, height: 900 });
    
    // Navigate to the prospecting page
    console.log("Navigating to prospecting page...");
    await page.goto("http://localhost:3000/share/prospecting?key=red-white-prospecting-2026", {
      waitUntil: "networkidle0",
    });
    
    // Wait additional 3 seconds for chart animations to complete
    console.log("Waiting for chart animations...");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    // Take full page screenshot
    console.log("Taking screenshot...");
    const screenshotBuffer = await page.screenshot({
      type: "png",
      fullPage: true,
    });
    
    await browser.close();
    console.log("Browser closed.");

    // STEP 4: Save screenshot to /tmp
    fs.writeFileSync(SCREENSHOT_PATH, screenshotBuffer);
    console.log(`Screenshot saved to ${SCREENSHOT_PATH}`);

    // STEP 5: Build WhatsApp caption
    let caption: string;
    if (messageType === "midweek") {
      caption = "📊 Mid-Week Prospecting Update — here's where we stand. Keep pushing!";
    } else {
      const motivationalQuote = getWeeklyQuote();
      caption = `🏁 Final Weekly Prospecting Results\n\n${motivationalQuote}`;
    }

    // STEP 6: Send to WhatsApp via GREEN-API
    let whatsappStatus = "sent";
    try {
      console.log("Sending to WhatsApp...");
      const greenApiUrl = `https://api.green-api.com/waInstance${process.env.GREEN_API_INSTANCE_ID}/sendFileByUpload/${process.env.GREEN_API_TOKEN}`;
      
      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append("chatId", "120363423418340005@g.us");
      formData.append("caption", caption);
      formData.append("fileName", "prospecting.png");
      
      // Create a File/Blob from the buffer
      const blob = new Blob([screenshotBuffer], { type: "image/png" });
      formData.append("file", blob, "prospecting.png");
      
      const whatsappResponse = await fetch(greenApiUrl, {
        method: "POST",
        body: formData,
        // Do NOT set Content-Type header - let fetch set it with boundary
      });
      
      if (!whatsappResponse.ok) {
        const errorText = await whatsappResponse.text();
        console.error("WhatsApp error:", errorText);
        whatsappStatus = `error: ${whatsappResponse.status}`;
      } else {
        console.log("WhatsApp sent successfully");
      }
    } catch (error) {
      console.error("WhatsApp send failed:", error);
      whatsappStatus = `error: ${error instanceof Error ? error.message : "unknown"}`;
    }

    // STEP 7: Send to Slack via incoming webhook
    let slackStatus = "sent";
    try {
      console.log("Sending to Slack...");
      const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
      
      if (!slackWebhookUrl) {
        throw new Error("SLACK_WEBHOOK_URL not configured");
      }
      
      const slackPayload = {
        text: caption,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: caption,
            },
          },
          {
            type: "image",
            image_url: "https://wte.red/api/screenshots/latest?t=" + Date.now(),
            alt_text: "Weekly Prospecting Results",
            title: {
              type: "plain_text",
              text: "Weekly Prospecting Results",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "<https://wte.red/share/prospecting?key=red-white-prospecting-2026|📈 View Live Chart>",
            },
          },
        ],
      };
      
      const slackResponse = await fetch(slackWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(slackPayload),
      });
      
      if (!slackResponse.ok) {
        const errorText = await slackResponse.text();
        console.error("Slack error:", errorText);
        slackStatus = `error: ${slackResponse.status}`;
      } else {
        console.log("Slack sent successfully");
      }
    } catch (error) {
      console.error("Slack send failed:", error);
      slackStatus = `error: ${error instanceof Error ? error.message : "unknown"}`;
    }

    // STEP 8: Return success response
    return Response.json({
      success: true,
      type: messageType,
      whatsapp: whatsappStatus,
      slack: slackStatus,
    });

  } catch (error) {
    console.error("Fatal error in send-prospecting:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
