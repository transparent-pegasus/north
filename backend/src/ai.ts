import { GoogleGenerativeAI } from "@google/generative-ai";
import { defineSecret, defineString } from "firebase-functions/params";

export const googleApiKey = defineSecret("GOOGLE_API_KEY");
const geminiModel = defineString("GEMINI_MODEL", {
  default: "gemini-2.0-flash-exp",
});

let genAI: GoogleGenerativeAI | null = null;

function getModel() {
  if (!genAI) {
    const apiKey = googleApiKey.value();
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY is not set");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }

  return genAI.getGenerativeModel({ model: geminiModel.value() });
}

const TIMEOUT_MS = 300000; // 300 seconds

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error("Gemini API Timeout")), timeoutMs);
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
  const model = getModel();

  const fullPrompt = `
You are a deep thinker. Your task is to decompose the given goal or step into concrete, actionable steps, ideal states, and conditions.
Adhere strictly to the requested JSON schema.

Input:
${prompt}

Output JSON:
`;

  try {
    const result = await retryWithBackoff(() =>
      withTimeout(
        model.generateContent({
          contents: [{ parts: [{ text: fullPrompt }], role: "user" }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
        TIMEOUT_MS,
      ),
    );

    const text = result.response.text();

    console.log("DEBUG: AI Raw Response:", text);

    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to generate/parse AI response", e);
    // Propagate the error so the API returns 500
    throw e;
  }
}

export async function summarizeContent(content: string): Promise<string> {
  const model = getModel();

  const fullPrompt = `
You are a research assistant. Summarize the following content in Japanese, focusing on key facts, actionable insights, and technical details relevant to the context.

Content:
${content.slice(0, 20000)}

Summary:
`;

  try {
    const result = await retryWithBackoff(() =>
      withTimeout(
        model.generateContent({
          contents: [{ parts: [{ text: fullPrompt }], role: "user" }],
        }),
        TIMEOUT_MS,
      ),
    );

    return result.response.text();
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
        `Rate limit or Service Unavailable hit (${error.status}), retrying in ${delay}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));

      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}
