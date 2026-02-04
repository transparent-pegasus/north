import { config } from "./config";
import type { Tree } from "./types";

import cors = require("cors");
import express = require("express");

import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";

import { applyDecomposition, decompose } from "./decomposition";
import { applyRefine, suggestRefine } from "./refinement";
import {
  addElement,
  createTree,
  deleteElement,
  deleteTree,
  getTree,
  listTrees,
  promoteIdealToGoal,
  saveTree,
  setActiveTree,
  updateElement,
  updateGoal,
} from "./tree";

import "./setup";

// --- Setup ---

// Ensure Admin is initialized (if not already by tree import)
if (getApps().length === 0) {
  initializeApp();
}

// Set global options for cost control
setGlobalOptions({
  maxInstances: 10,
  region: "asia-northeast1",
  timeoutSeconds: 300,
});

const app = express();

// Enable CORS
app.use(cors({ origin: true }));
app.use(express.json());

// Rewrite /api/* to /* so that the router matches correctly
app.use((req, _res, next) => {
  const originalUrl = req.url;
  if (req.url.startsWith("/api")) {
    req.url = req.url.replace("/api", "");
    if (req.url === "") req.url = "/";
  }
  console.log(`[API Request] ${req.method} ${originalUrl} -> ${req.url} (path: ${req.path})`);
  next();
});

// --- Middleware ---

const checkAuthMiddleware: express.RequestHandler = async (req, res, next) => {
  // Public endpoints - use req.path which matches the router's view of the world
  // After our rewrite middleware, req.url is changed, but Express's req.path
  // might still reflect the original path in some versions/environments.
  const path = req.url.split("?")[0];
  if (path === "/health" || req.method === "OPTIONS") {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    console.log("DEBUG: checkAuth - No bearer token found");
    res.status(401).json({ error: "Unauthorized" });

    return;
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    // Emulator Bypass
    if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      const parts = idToken.split(".");

      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());

        req.user = { uid: payload.user_id };

        return next();
      }
    }

    const decodedToken = await getAuth().verifyIdToken(idToken);

    req.user = { uid: decodedToken.uid };
    next();
  } catch (error) {
    console.error("Auth Error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
};

app.use(checkAuthMiddleware);

const RATE_LIMITS = config.limits;

const rateLimitMiddleware = (actionType: keyof typeof RATE_LIMITS): express.RequestHandler => {
  return async (req, res, next) => {
    const uid = req.user?.uid;

    if (!uid) {
      res.status(401).json({ error: "Unauthorized" });

      return;
    }

    const now = new Date();
    const dateKey = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const limitRef = getFirestore()
      .collection("users")
      .doc(uid)
      .collection("daily_limit")
      .doc(dateKey);

    try {
      await getFirestore().runTransaction(async (t) => {
        const doc = await t.get(limitRef);
        const data = doc.data() || {};
        const current = data[actionType] || 0;

        if (current >= RATE_LIMITS[actionType]) {
          throw new Error("Rate limit exceeded");
        }

        t.set(limitRef, { [actionType]: current + 1 }, { merge: true });
      });
      next();
    } catch (e: any) {
      if (e.message === "Rate limit exceeded") {
        res.status(429).json({
          error: `Daily limit for ${actionType} exceeded (${RATE_LIMITS[actionType]}/day)`,
        });
      } else {
        console.error("Rate limit check failed", e);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  };
};

const handleError = (res: express.Response, error: any) => {
  console.error(error);
  const message = error.message || "";

  if (message.includes("429") || message.includes("Quota exceeded")) {
    res.status(429).json({
      code: "QUOTA_EXCEEDED",
      error: "AIの利用制限に達しました。",
    });
  } else {
    res.status(500).json({
      error: "サーバーエラーが発生しました。",
    });
  }
};

// --- Routes ---

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- Tree Management ---

app.get("/trees", async (req, res) => {
  try {
    const uid = req.user.uid;
    const index = await listTrees(uid);

    res.json(index);
  } catch (error: any) {
    handleError(res, error);
  }
});

app.post("/trees", async (req, res) => {
  try {
    const uid = req.user.uid;

    // Check tree limit
    const index = await listTrees(uid);
    if (index.trees.length >= config.limits.maxTrees) {
      res.status(403).json({ error: "Tree creation limit reached" });
      return;
    }

    const { name } = req.body;
    const tree = await createTree(uid, name || "新しいゴール");

    res.json(tree);
  } catch (error: any) {
    handleError(res, error);
  }
});

app.get("/trees/:id", async (req, res) => {
  try {
    const uid = req.user.uid;
    const id = req.params.id;
    console.log(`[API] Fetching tree: ${id} for user: ${uid}`);
    const tree = await getTree(uid, id);

    if (!tree) {
      console.log(`[API] Tree not found: ${id} for user: ${uid}`);
      res.status(404).json({ error: "Tree not found" });
      return;
    }

    res.json(tree);
  } catch (error: any) {
    handleError(res, error);
  }
});

app.delete("/trees/:id", async (req, res) => {
  try {
    const uid = req.user.uid;
    const id = req.params.id;
    const index = await deleteTree(uid, id);

    res.json(index);
  } catch (error: any) {
    handleError(res, error);
  }
});

app.put("/trees/:id/active", async (req, res) => {
  try {
    const uid = req.user.uid;
    const id = req.params.id;
    const index = await setActiveTree(uid, id);

    res.json(index);
  } catch (error: any) {
    handleError(res, error);
  }
});

app.get("/tree", async (req, res) => {
  try {
    const uid = req.user.uid;
    console.log(`[API] Fetching active tree for user: ${uid}`);
    const tree = await getTree(uid);

    if (!tree) {
      console.log(`[API] No active tree found for user: ${uid}`);
      res.status(404).json({ error: "No active tree found" });
      return;
    }

    res.json(tree);
  } catch (error: any) {
    handleError(res, error);
  }
});

app.post("/tree", async (req, res) => {
  try {
    const uid = req.user.uid;
    const tree = req.body as Tree;

    await saveTree(uid, tree);
    res.json(tree);
  } catch (error: any) {
    handleError(res, error);
  }
});

// --- Goal ---

app.post("/goal", async (req, res) => {
  try {
    const uid = req.user.uid;
    const { content } = req.body;
    const tree = await updateGoal(uid, content);

    res.json(tree);
  } catch (error: any) {
    handleError(res, error);
  }
});

// --- Element Operations ---

app.put("/element", async (req, res) => {
  try {
    const uid = req.user.uid;
    const { condition, content, currentState, id, type } = req.body;
    const tree = await updateElement(uid, id, type, content, condition, currentState);

    res.json(tree);
  } catch (error: any) {
    handleError(res, error);
  }
});

app.delete("/element", async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id, type } = req.body;
    const tree = await deleteElement(uid, id, type);

    res.json(tree);
  } catch (error: any) {
    handleError(res, error);
  }
});

app.post("/add-element", async (req, res) => {
  try {
    const uid = req.user.uid;
    const { condition, content, currentState, parentId } = req.body;
    const tree = await addElement(uid, parentId, "goal", content, condition, currentState);

    res.json(tree);
  } catch (error: any) {
    handleError(res, error);
  }
});

// --- Promote Operations ---

app.post("/promote", async (req, res) => {
  try {
    const uid = req.user.uid;
    const { idealId, treeId } = req.body;
    const newTreeId = await promoteIdealToGoal(uid, idealId, treeId);

    res.json({ id: newTreeId });
  } catch (error: any) {
    handleError(res, error);
  }
});

// --- AI Operations ---

app.post("/decompose", rateLimitMiddleware("decompose"), async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id, maxItems, type } = req.body;
    const proposal = await decompose(uid, id, type, maxItems || 5);

    res.json(proposal);
  } catch (error: any) {
    handleError(res, error);
  }
});

app.post("/apply-decomposition", async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id, proposal } = req.body;
    const tree = await applyDecomposition(uid, id, proposal);

    res.json(tree);
  } catch (error: any) {
    handleError(res, error);
  }
});

app.post("/suggest-refine", rateLimitMiddleware("refine"), async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id, instruction, type } = req.body;
    const result = await suggestRefine(uid, id, type, instruction);

    res.json(result);
  } catch (error: any) {
    handleError(res, error);
  }
});

app.post("/apply-refine", async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id, newContent, type } = req.body;
    const tree = await applyRefine(uid, id, type, newContent);

    res.json(tree);
  } catch (error: any) {
    handleError(res, error);
  }
});

// --- Research Operations ---

app.delete("/research", async (req, res) => {
  try {
    const uid = req.user.uid;
    const { nodeId, researchId } = req.body;
    const { getTree, saveTree } = require("./tree");
    const tree = await getTree(uid);
    const ideal = tree.goal.idealStates.find((i: any) => i.id === nodeId);

    if (ideal?.researchResults) {
      const initialLength = ideal.researchResults.length;

      ideal.researchResults = ideal.researchResults.filter((r: any) => r.id !== researchId);
      if (ideal.researchResults.length !== initialLength) {
        await saveTree(uid, tree);
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    handleError(res, error);
  }
});

app.post("/research/candidates", async (req, res) => {
  try {
    const { spec } = req.body;
    const { getResearchCandidates } = require("./research");
    const results = await getResearchCandidates(spec);

    res.json({ results });
  } catch (error: any) {
    handleError(res, error);
  }
});

app.post("/research/execute", rateLimitMiddleware("research"), async (req, res) => {
  try {
    const uid = req.user.uid;
    const { nodeId, url } = req.body;
    const { executeResearch } = require("./research");
    const summary = await executeResearch(url);

    // Get the tree to find current keywords/source for the node
    const { getTree, saveResearchResult } = require("./tree");
    const tree = await getTree(uid);
    const ideal = tree.goal.idealStates.find((i: any) => i.id === nodeId);

    if (ideal) {
      await saveResearchResult(
        uid,
        nodeId,
        ideal.researchSpec?.source || "web",
        ideal.researchSpec?.keywords || [],
        summary,
        url,
      );
    }

    res.json({ summary });
  } catch (error: any) {
    handleError(res, error);
  }
});

app.post("/research/auto", rateLimitMiddleware("research"), async (req, res) => {
  try {
    const uid = req.user.uid;
    const { nodeId, spec } = req.body;
    const { getResearchCandidates } = require("./research");

    // 1. Get Candidates
    const candidates = await getResearchCandidates(spec);

    // 2. Take top 3
    const top3 = candidates.slice(0, 3);

    if (top3.length === 0) {
      return res.json({ count: 0, message: "No candidates found" });
    }

    // 3. Save to Tree
    const { saveResearchSearchResults } = require("./tree");

    await saveResearchSearchResults(uid, nodeId, spec.source, spec.keywords, top3);

    res.json({ count: top3.length, results: top3 });
  } catch (error: any) {
    handleError(res, error);
  }
});

app.post("/research/manual", async (req, res) => {
  try {
    const uid = req.user.uid;
    const { nodeId, title, url, snippet } = req.body;
    const { saveResearchSearchResults } = require("./tree");

    const item = {
      title: title || "Manual Entry",
      url: url || "",
      snippet: snippet || "",
    };

    // Save as a "manual" source result
    await saveResearchSearchResults(uid, nodeId, "manual", ["Manual Entry"], [item]);

    res.json({ success: true, item });
  } catch (error: any) {
    handleError(res, error);
  }
});

app.get("/user/limits", async (req, res) => {
  try {
    const uid = req.user.uid;
    const now = new Date();
    const dateKey = now.toISOString().split("T")[0]; // YYYY-MM-DD

    const doc = await getFirestore()
      .collection("users")
      .doc(uid)
      .collection("daily_limit")
      .doc(dateKey)
      .get();

    const data = doc.data() || {};

    const treeIndex = await listTrees(uid);

    res.json({
      decompose: data.decompose || 0,
      refine: data.refine || 0,
      research: data.research || 0,
      treeCount: treeIndex.trees.length,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Export the Express app for testing
export { app };

import { googleApiKey } from "./ai";

// Export the Express app as a Firebase Function
export const api = onRequest({ secrets: [googleApiKey] }, app);
