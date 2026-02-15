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

if (getApps().length === 0) {
  initializeApp();
}

setGlobalOptions({
  maxInstances: 10,
  region: "asia-northeast1",
  timeoutSeconds: 300,
});

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// --- Auth Middleware ---

const checkAuthMiddleware: express.RequestHandler = async (req, res, next) => {
  // Public endpoints
  if (req.path === "/health" || req.method === "OPTIONS") {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
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

const RATE_LIMITS = config.limits;

const rateLimitMiddleware = (actionType: keyof typeof RATE_LIMITS): express.RequestHandler => {
  return async (req, res, next) => {
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const now = new Date();
    const dateKey = now.toISOString().split("T")[0];
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

// --- Router Definition ---

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.use(checkAuthMiddleware);

// Tree Management
router.get("/trees", async (req, res) => {
  try {
    const uid = req.user.uid;
    const index = await listTrees(uid);
    res.json(index);
  } catch (error: any) {
    handleError(res, error);
  }
});

router.post("/trees", async (req, res) => {
  try {
    const uid = req.user.uid;
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

router.get("/trees/:id", async (req, res) => {
  try {
    const uid = req.user.uid;
    const id = req.params.id;
    const tree = await getTree(uid, id);
    if (!tree) {
      res.status(404).json({ error: "Tree not found" });
      return;
    }
    res.json(tree);
  } catch (error: any) {
    handleError(res, error);
  }
});

router.delete("/trees/:id", async (req, res) => {
  try {
    const uid = req.user.uid;
    const id = req.params.id;
    const index = await deleteTree(uid, id);
    res.json(index);
  } catch (error: any) {
    handleError(res, error);
  }
});

router.put("/trees/:id/active", async (req, res) => {
  try {
    const uid = req.user.uid;
    const id = req.params.id;
    const index = await setActiveTree(uid, id);
    res.json(index);
  } catch (error: any) {
    handleError(res, error);
  }
});

// Alias for active tree
router.get("/tree", async (req, res) => {
  try {
    const uid = req.user.uid;
    const tree = await getTree(uid);
    if (!tree) {
      res.status(404).json({ error: "No active tree found" });
      return;
    }
    res.json(tree);
  } catch (error: any) {
    handleError(res, error);
  }
});

router.post("/tree", async (req, res) => {
  try {
    const uid = req.user.uid;
    const tree = req.body as Tree;
    await saveTree(uid, tree);
    res.json(tree);
  } catch (error: any) {
    handleError(res, error);
  }
});

// Goal & Elements
router.post("/goal", async (req, res) => {
  try {
    const uid = req.user.uid;
    const { content } = req.body;
    const tree = await updateGoal(uid, content);
    res.json(tree);
  } catch (error: any) {
    handleError(res, error);
  }
});

router.put("/element", async (req, res) => {
  try {
    const uid = req.user.uid;
    const { condition, content, currentState, id, type } = req.body;
    const tree = await updateElement(uid, id, type, content, condition, currentState);
    res.json(tree);
  } catch (error: any) {
    handleError(res, error);
  }
});

router.delete("/element", async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id, type } = req.body;
    const tree = await deleteElement(uid, id, type);
    res.json(tree);
  } catch (error: any) {
    handleError(res, error);
  }
});

router.post("/add-element", async (req, res) => {
  try {
    const uid = req.user.uid;
    const { condition, content, currentState, parentId } = req.body;
    const tree = await addElement(uid, parentId, "goal", content, condition, currentState);
    res.json(tree);
  } catch (error: any) {
    handleError(res, error);
  }
});

router.post("/promote", async (req, res) => {
  try {
    const uid = req.user.uid;
    const { idealId, treeId } = req.body;
    const newTreeId = await promoteIdealToGoal(uid, idealId, treeId);
    res.json({ id: newTreeId });
  } catch (error: any) {
    handleError(res, error);
  }
});

// AI
router.post("/decompose", rateLimitMiddleware("decompose"), async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id, maxItems, type } = req.body;
    const proposal = await decompose(uid, id, type, maxItems || 5);
    res.json(proposal);
  } catch (error: any) {
    handleError(res, error);
  }
});

router.post("/apply-decomposition", async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id, proposal } = req.body;
    const tree = await applyDecomposition(uid, id, proposal);
    res.json(tree);
  } catch (error: any) {
    handleError(res, error);
  }
});

router.post("/suggest-refine", rateLimitMiddleware("refine"), async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id, instruction, type } = req.body;
    const result = await suggestRefine(uid, id, type, instruction);
    res.json(result);
  } catch (error: any) {
    handleError(res, error);
  }
});

router.post("/apply-refine", async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id, newContent, type } = req.body;
    const tree = await applyRefine(uid, id, type, newContent);
    res.json(tree);
  } catch (error: any) {
    handleError(res, error);
  }
});

// Research
router.delete("/research", async (req, res) => {
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

router.post("/research/candidates", async (req, res) => {
  try {
    const { spec } = req.body;
    const { getResearchCandidates } = require("./research");
    const results = await getResearchCandidates(spec);
    res.json({ results });
  } catch (error: any) {
    handleError(res, error);
  }
});

router.post("/research/execute", rateLimitMiddleware("research"), async (req, res) => {
  try {
    const uid = req.user.uid;
    const { nodeId, url } = req.body;
    const { executeResearch } = require("./research");
    const summary = await executeResearch(url);
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

router.post("/research/auto", rateLimitMiddleware("research"), async (req, res) => {
  try {
    const uid = req.user.uid;
    const { nodeId, spec } = req.body;
    const { getResearchCandidates } = require("./research");
    const candidates = await getResearchCandidates(spec);
    const top3 = candidates.slice(0, 3);
    if (top3.length === 0) {
      return res.json({ count: 0, message: "No candidates found" });
    }
    const { saveResearchSearchResults } = require("./tree");
    await saveResearchSearchResults(uid, nodeId, spec.source, spec.keywords, top3);
    res.json({ count: top3.length, results: top3 });
  } catch (error: any) {
    handleError(res, error);
  }
});

router.post("/research/manual", async (req, res) => {
  try {
    const uid = req.user.uid;
    const { nodeId, title, url, snippet } = req.body;
    const { saveResearchSearchResults } = require("./tree");
    const item = { title: title || "Manual Entry", url: url || "", snippet: snippet || "" };
    await saveResearchSearchResults(uid, nodeId, "manual", ["Manual Entry"], [item]);
    res.json({ success: true, item });
  } catch (error: any) {
    handleError(res, error);
  }
});

router.get("/user/limits", async (req, res) => {
  try {
    const uid = req.user.uid;
    const now = new Date();
    const dateKey = now.toISOString().split("T")[0];
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

// --- Final Mount ---

// This handles both direct function calls (path starts with /trees)
// and Hosting rewrites (path starts with /api/trees)
app.use("/api", router);
app.use("/", router);

export { app };

import { secrets } from "./ai";
export const api = onRequest({ secrets }, app);
