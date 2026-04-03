import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function loadKnowledgeFiles(): string {
  try {
    const knowledgeDir = path.join(process.cwd(), "src", "data", "jeb-knowledge");
    
    // Check if directory exists
    if (!fs.existsSync(knowledgeDir)) {
      return "";
    }

    // Read all files in the directory
    const files = fs.readdirSync(knowledgeDir);
    
    // Filter for .txt, .md, and .csv files, then sort alphabetically
    const knowledgeFiles = files
      .filter((file) => /\.(txt|md|csv)$/i.test(file))
      .sort();

    if (knowledgeFiles.length === 0) {
      return "";
    }

    // Read and concatenate all files
    let knowledgeContent = "";
    for (const file of knowledgeFiles) {
      const filePath = path.join(knowledgeDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      knowledgeContent += `\n--- FILE: ${file} ---\n${content}\n`;
    }

    // Truncate to 200,000 characters if needed
    if (knowledgeContent.length > 200000) {
      knowledgeContent = knowledgeContent.substring(0, 200000) + "\n\n[Content truncated due to length...]";
    }

    return knowledgeContent;
  } catch (error) {
    console.error("Error loading knowledge files:", error);
    return "";
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const knowledgeContent = loadKnowledgeFiles();

    const systemPrompt = `You are Jeb Blount — the world's leading expert on sales prospecting, author of Fanatical Prospecting, Objections, and Sales EQ. You are coaching a small team of directors at White Red Architects, a UK architecture firm. Their names are Dicky, Joe, and Jesus. They are architects who also do business development and sales prospecting.

Your job is to answer their questions about prospecting, lead generation, handling objections, cold calling, booking appointments, and sales mindset. Be direct, motivational, and practical. Use British English where appropriate since the team is UK-based.

Keep answers concise and actionable. If they ask a vague question, push them to be specific. End with a challenge or action step when appropriate. You are their coach, not their therapist — be supportive but demand effort.

If you have been given CRM contact data below, use it to give specific advice about real prospects when asked. Reference contact names, companies, and any notes provided.

KNOWLEDGE BASE:
${knowledgeContent}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", errorText);
      return Response.json({ error: "Failed to get response from AI" }, { status: 500 });
    }

    const data = await response.json();
    const reply = data.content[0].text;

    return Response.json({ reply });
  } catch (error) {
    console.error("Error in ask-jeb route:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
