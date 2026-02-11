import request from "supertest";

import { app } from "../index";

// Mock Firebase Admin
jest.mock("firebase-admin/app", () => ({
  getApps: jest.fn(() => []),
  initializeApp: jest.fn(),
}));

jest.mock("firebase-admin/auth", () => ({
  getAuth: jest.fn(() => ({
    verifyIdToken: jest.fn(async (token) => {
      if (token === "valid-token") return { uid: "test-user" };
      throw new Error("Invalid token");
    }),
  })),
}));

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({})),
        })),
        get: jest.fn(async () => ({
          data: () => ({}),
          exists: true,
        })),
      })),
    })),
    runTransaction: jest.fn((cb) =>
      cb({
        get: jest.fn(async () => ({ data: () => ({}) })),
        set: jest.fn(),
      }),
    ),
  })),
}));

// Mock AI functions
jest.mock("../ai", () => ({
  generateContemplation: jest.fn(async () => ({
    additions: [
      {
        condition: "Test Condition",
        current: "Test Current",
        ideal: "Test Ideal",
      },
    ],
    existing: [],
  })),
  geminiApiKey: {
    value: jest.fn(() => "test-api-key"),
    name: "GEMINI_API_KEY",
  },
}));

// Mock Research functions
jest.mock("../research", () => ({
  executeResearch: jest.fn(async () => "Test Summary"),
  getResearchCandidates: jest.fn(async () => [
    {
      snippet: "Test Snippet",
      title: "Test Result",
      url: "https://example.com",
    },
  ]),
}));

describe("API Endpoints", () => {
  it("GET /health should return 200", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("POST /research/candidates should return 200 with candidates", async () => {
    const res = await request(app)
      .post("/api/research/candidates")
      .set("Authorization", "Bearer valid-token")
      .send({
        spec: {
          keywords: ["test"],
          source: "arxiv",
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.results).toBeDefined();
    expect(res.body.results.length).toBeGreaterThan(0);
  });
});
