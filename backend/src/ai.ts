import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { defineSecret } from "firebase-functions/params";
import { config } from "./config";

const isLocal = process.env.FUNCTIONS_EMULATOR === "true";

export const geminiApiKey = isLocal ? defineSecret("GEMINI_API_KEY") : null;
export const claudeApiKey = isLocal ? null : defineSecret("CLAUDE_API_KEY");

// Export secrets array for use in index.ts
export const secrets: any[] = [];
if (geminiApiKey) secrets.push(geminiApiKey);
if (claudeApiKey) secrets.push(claudeApiKey);

// Clients
let genAI: GoogleGenerativeAI | null = null;
let anthropic: Anthropic | null = null;

function getGeminiModel() {
  if (!genAI) {
    const apiKey = geminiApiKey?.value();
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI.getGenerativeModel({ model: config.gemini.model });
}

function getAnthropicClient() {
  if (!anthropic) {
    const apiKey = claudeApiKey?.value();
    if (!apiKey) throw new Error("CLAUDE_API_KEY is not set");
    anthropic = new Anthropic({ apiKey });
  }
  return anthropic;
}

const TIMEOUT_MS = 300000; // 300 seconds

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error("API Timeout")), timeoutMs);
  });

  return Promise.race([
    promise.then((res) => {
      clearTimeout(timeoutHandle);
      return res;
    }),
    timeoutPromise,
  ]);
}

export async function generateContemplation(prompt: string, _schema: any): Promise<any> {
  const systemPrompt = `
You are a deep thinker. Your task is to decompose the given goal or step into concrete, actionable steps, ideal states, and conditions.
Adhere strictly to the requested JSON schema.
Output JSON only.
`;

  try {
    if (isLocal) {
      // --- GEMINI (Local) ---
      const model = getGeminiModel();
      const result = await retryWithBackoff(() =>
        withTimeout(
          model.generateContent({
            contents: [{ parts: [{ text: `${systemPrompt}\nInput:\n${prompt}` }], role: "user" }],
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
          TIMEOUT_MS,
        ),
      );
      const text = result.response.text();
      return JSON.parse(text);
    } else {
      // --- CLAUDE (Prod) ---
      const client = getAnthropicClient();
      const msg = await retryWithBackoff(() =>
        withTimeout(
          client.messages.create({
            model: config.claude.model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [{ role: "user", content: prompt }],
          }),
          TIMEOUT_MS,
        ),
      );

      const contentBlock = msg.content[0];
      if (contentBlock.type !== "text") {
        throw new Error("Unexpected response type from Claude");
      }

      let jsonString = contentBlock.text;
      // Clean up markdown code blocks if present
      jsonString = jsonString
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      return JSON.parse(jsonString);
    }
  } catch (e: any) {
    console.error("Failed to generate/parse AI response", e);
    throw e;
  }
}

export async function summarizeContent(content: string): Promise<string> {
  const systemPrompt = `
You are a research assistant. Summarize the following content in Japanese, focusing on key facts, actionable insights, and technical details relevant to the context.
`;
  const userContent = `Content:\n${content.slice(0, 20000)}\n\nSummary:`;

  try {
    if (isLocal) {
      // --- GEMINI (Local) ---
      const model = getGeminiModel();
      const result = await retryWithBackoff(() =>
        withTimeout(
          model.generateContent({
            contents: [{ parts: [{ text: `${systemPrompt}\n${userContent}` }], role: "user" }],
          }),
          TIMEOUT_MS,
        ),
      );
      return result.response.text();
    } else {
      // --- CLAUDE (Prod) ---
      const client = getAnthropicClient();
      const msg = await retryWithBackoff(() =>
        withTimeout(
          client.messages.create({
            model: config.claude.model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [{ role: "user", content: userContent }],
          }),
          TIMEOUT_MS,
        ),
      );

      const contentBlock = msg.content[0];
      if (contentBlock.type !== "text") {
        throw new Error("Unexpected response type from Claude");
      }
      return contentBlock.text;
    }
  } catch (e) {
    console.error("AI Summarization failed", e);
    throw e;
  }
}

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (
      retries > 0 &&
      (error.status === 429 ||
        error.status === 503 ||
        error.message?.includes("429") ||
        error.message?.includes("503"))
    ) {
      console.log(
        `Rate limit or Service Unavailable hit (${error.status || error.message}), retrying in ${delay}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));

      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}
