import fs from "fs";
import os from "os";
import path from "path";
import puppeteer from "puppeteer";

const SCREENSHOT_PATH = path.join(os.tmpdir(), "prospecting-personal-latest.png");

const RECIPIENTS = [
  { name: 'Dicky', chatId: '447969439991@c.us' },
];

const CAPTIONS = [
  "📊 Quick leads check-in — here's where we're at. Keep pushing.",
  "👀 Jeb here. Just keeping an eye on the pipeline for you.",
  "🚀 Mid-period update — this is the current state of play.",
  "💪 Checking in on the prospecting. Don't let it slip.",
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const secret = searchParams.get("secret");
    if (secret !== "norman-send-2026") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const screenshotUrl = "https://wte.red/share/prospecting?key=red-white-prospecting-2026&animate=false";

    console.log("Warming up Monday.com API...");
    await fetch("http://localhost:3000/api/monday").catch(() => {});

    console.log("Launching browser...");
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 900 });

    console.log("First page load (warm-up)...");
    await page.goto(screenshotUrl, { waitUntil: "networkidle0", timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log("Reloading page for clean render...");
    await page.reload({ waitUntil: "networkidle0", timeout: 60000 });

    await page.evaluate(() => {
      const style = document.createElement("style");
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `;
      document.head.appendChild(style);
    });

    console.log("Waiting for chart bars...");
    await page.waitForFunction(() => {
      const bars = document.querySelectorAll('[data-testid="chart-bar"]');
      return bars.length > 0;
    }, { timeout: 30000 }).catch(() => {
      console.log("No bars detected - may be a zero-data week");
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log("Taking screenshot...");
    const screenshotBuffer = await page.screenshot({ fullPage: true });

    await browser.close();
    console.log("Browser closed.");

    fs.writeFileSync(SCREENSHOT_PATH, screenshotBuffer);

    const caption = CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)];

    const greenApiUrl = `https://api.green-api.com/waInstance${process.env.GREEN_API_INSTANCE_ID}/sendFileByUpload/${process.env.GREEN_API_TOKEN}`;

    const results: Record<string, string> = {};

    for (const recipient of RECIPIENTS) {
      try {
        console.log(`Sending to ${recipient.name} (${recipient.chatId})...`);
        const formData = new FormData();
        formData.append("chatId", recipient.chatId);
        formData.append("caption", caption);
        formData.append("fileName", "prospecting.png");

        const blob = new Blob([Buffer.from(screenshotBuffer)], { type: "image/png" });
        formData.append("file", blob, "prospecting.png");

        const response = await fetch(greenApiUrl, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`WhatsApp error for ${recipient.name}:`, errorText);
          results[recipient.name] = `error: ${response.status}`;
        } else {
          console.log(`Sent to ${recipient.name} successfully`);
          results[recipient.name] = "sent";
        }
      } catch (error) {
        console.error(`Send failed for ${recipient.name}:`, error);
        results[recipient.name] = `error: ${error instanceof Error ? error.message : "unknown"}`;
      }
    }

    return Response.json({ success: true, caption, results });

  } catch (error) {
    console.error("Fatal error in send-prospecting-personal:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
}
