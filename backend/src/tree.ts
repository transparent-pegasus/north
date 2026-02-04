import { randomUUID } from "crypto";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { Goal, IdealState, Tree, TreeIndex } from "./types";

import "./setup";

// Initialize Firestore
if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();

const TREES_COLLECTION = "trees";
const INDEX_DOC = "tree_index";
const META_COLLECTION = "meta";

function getUserRoot(userId: string) {
  return db.collection("users").doc(userId);
}

// --- Index Management ---

async function getIndex(userId: string): Promise<TreeIndex> {
  console.log(`[Firestore] Fetching index for user ${userId}`);
  try {
    const doc = await getUserRoot(userId).collection(META_COLLECTION).doc(INDEX_DOC).get();

    if (doc.exists) {
      console.log(`[Firestore] Index found`);

      return doc.data() as TreeIndex;
    }
    console.log(`[Firestore] Index not found, creating initial`);
    const initial: TreeIndex = { activeTreeId: "", trees: [] };

    await saveIndex(userId, initial);

    return initial;
  } catch (error) {
    console.error(`[Firestore] Error in getIndex:`, error);
    throw error;
  }
}

async function saveIndex(userId: string, index: TreeIndex): Promise<void> {
  console.log(`[Firestore] Saving index for user ${userId}`);
  try {
    await getUserRoot(userId).collection(META_COLLECTION).doc(INDEX_DOC).set(index);
    console.log(`[Firestore] Index saved successfully`);
  } catch (error) {
    console.error(`[Firestore] Error in saveIndex:`, error);
    throw error;
  }
}

// --- Tree CRUD ---

export async function listTrees(userId: string): Promise<TreeIndex> {
  const index = await getIndex(userId);

  // If no active tree is set but trees exist, set the first one as active
  if (!index.activeTreeId && index.trees.length > 0) {
    index.activeTreeId = index.trees[0].id;
    await saveIndex(userId, index);
  }

  return index;
}

export async function getTree(userId: string, id?: string): Promise<Tree | null> {
  const index = await getIndex(userId);
  const targetId = id || index.activeTreeId;

  if (!targetId) {
    return null;
  }

  const doc = await getUserRoot(userId).collection(TREES_COLLECTION).doc(targetId).get();

  if (doc.exists) {
    return doc.data() as Tree;
  }

  return null;
}

export async function saveTree(userId: string, tree: Tree): Promise<void> {
  tree.updatedAt = new Date().toISOString();
  await getUserRoot(userId).collection(TREES_COLLECTION).doc(tree.id).set(tree);

  const index = await getIndex(userId);
  const existing = index.trees.find((t) => t.id === tree.id);

  if (existing) {
    existing.name = tree.name;
    existing.updatedAt = tree.updatedAt;
  } else {
    index.trees.push({
      id: tree.id,
      name: tree.name,
      updatedAt: tree.updatedAt,
    });
  }
  if (!index.activeTreeId) index.activeTreeId = tree.id;
  await saveIndex(userId, index);
}

export async function createTree(userId: string, name: string): Promise<Tree> {
  const tree: Tree = {
    createdAt: new Date().toISOString(),
    goal: {
      content: name,
      id: randomUUID(),
      idealStates: [],
    },
    id: randomUUID(),
    name,
    updatedAt: new Date().toISOString(),
  };

  await saveTree(userId, tree);

  const index = await getIndex(userId);

  index.activeTreeId = tree.id;
  await saveIndex(userId, index);

  return tree;
}

export async function deleteTree(userId: string, id: string): Promise<TreeIndex> {
  const index = await getIndex(userId);

  index.trees = index.trees.filter((t) => t.id !== id);

  await getUserRoot(userId).collection(TREES_COLLECTION).doc(id).delete();

  if (index.activeTreeId === id) {
    index.activeTreeId = index.trees[0]?.id || "";
  }
  await saveIndex(userId, index);

  return index;
}

export async function setActiveTree(userId: string, id: string): Promise<TreeIndex> {
  const index = await getIndex(userId);

  index.activeTreeId = id;
  await saveIndex(userId, index);

  return index;
}

export async function updateGoal(userId: string, content: string): Promise<Tree> {
  const tree = await getTree(userId);
  if (!tree) throw new Error("Tree not found");

  tree.goal.content = content;
  tree.name = content;
  await saveTree(userId, tree);

  return tree;
}

export async function promoteIdealToGoal(
  userId: string,
  idealId: string,
  parentTreeId: string,
): Promise<string> {
  const parentTree = await getTree(userId, parentTreeId);

  if (!parentTree) throw new Error("Parent tree not found");

  const ideal = parentTree.goal.idealStates.find((i) => i.id === idealId);

  if (!ideal) throw new Error("Ideal state not found");

  const newTree = await createTree(userId, ideal.content);

  return newTree.id;
}

export async function addElement(
  userId: string,
  _parentId: string,
  parentType: "goal",
  content: string,
  conditionContent: string,
  currentStateContent: string,
): Promise<Tree> {
  const tree = await getTree(userId);
  if (!tree) throw new Error("Tree not found");

  if (parentType === "goal") {
    const newIdeal: IdealState = {
      condition: {
        content: conditionContent,
        id: randomUUID(),
      },
      content,
      currentState: {
        content: currentStateContent,
        id: randomUUID(),
      },
      id: randomUUID(),
      researchResults: [],
      researchSpec: null,
    };

    tree.goal.idealStates.unshift(newIdeal);
  }

  await saveTree(userId, tree);

  return tree;
}

export async function updateElement(
  userId: string,
  id: string,
  type: "goal" | "ideal",
  content: string,
  condition?: string,
  currentState?: string,
): Promise<Tree> {
  const tree = await getTree(userId);
  if (!tree) throw new Error("Tree not found");

  if (type === "goal") {
    tree.goal.content = content;
    tree.name = content;
  } else if (type === "ideal") {
    const ideal = tree.goal.idealStates.find((i) => i.id === id);

    if (ideal) {
      ideal.content = content;

      if (condition !== undefined) {
        if (ideal.condition) {
          ideal.condition.content = condition;
        } else {
          ideal.condition = { content: condition, id: randomUUID() };
        }
      }

      if (currentState !== undefined) {
        if (ideal.currentState) {
          ideal.currentState.content = currentState;
        } else {
          ideal.currentState = { content: currentState, id: randomUUID() };
        }
      }
    }
  }

  await saveTree(userId, tree);

  return tree;
}

export async function deleteElement(userId: string, id: string, type: "ideal"): Promise<Tree> {
  const tree = await getTree(userId);
  if (!tree) throw new Error("Tree not found");

  if (type === "ideal") {
    tree.goal.idealStates = tree.goal.idealStates.filter((i) => i.id !== id);
  }

  await saveTree(userId, tree);
  return tree;
}

export async function saveResearchResult(
  userId: string,
  nodeId: string,
  source: string,
  keywords: string[],
  summary: string,
  url: string,
): Promise<Tree> {
  return await db.runTransaction(async (transaction) => {
    const userRoot = getUserRoot(userId);
    const indexRef = userRoot.collection(META_COLLECTION).doc(INDEX_DOC);
    const indexDoc = await transaction.get(indexRef);

    if (!indexDoc.exists) throw new Error("User index not found");
    const index = indexDoc.data() as TreeIndex;
    const treeId = index.activeTreeId;

    if (!treeId) throw new Error("No active tree found");

    const treeRef = userRoot.collection(TREES_COLLECTION).doc(treeId);
    const treeDoc = await transaction.get(treeRef);

    if (!treeDoc.exists) throw new Error("Active tree not found");

    const tree = treeDoc.data() as Tree;
    const ideal = tree.goal.idealStates.find((i) => i.id === nodeId);

    if (!ideal) {
      throw new Error("Target node not found");
    }

    const result = {
      createdAt: new Date().toISOString(),
      id: randomUUID(),
      keywords,
      results: [
        {
          snippet: summary,
          title: "Research Summary",
          url,
        },
      ],
      source: source,
    };

    ideal.researchResults.push(result);
    tree.updatedAt = new Date().toISOString();

    transaction.set(treeRef, tree);

    return tree;
  });
}

export async function saveResearchSearchResults(
  userId: string,
  nodeId: string,
  source: string,
  keywords: string[],
  results: { snippet: string; title: string; url: string }[],
): Promise<Tree> {
  return await db.runTransaction(async (transaction) => {
    const userRoot = getUserRoot(userId);
    const indexRef = userRoot.collection(META_COLLECTION).doc(INDEX_DOC);
    const indexDoc = await transaction.get(indexRef);

    if (!indexDoc.exists) throw new Error("User index not found");
    const index = indexDoc.data() as TreeIndex;
    const treeId = index.activeTreeId;

    if (!treeId) throw new Error("No active tree found");

    const treeRef = userRoot.collection(TREES_COLLECTION).doc(treeId);
    const treeDoc = await transaction.get(treeRef);

    if (!treeDoc.exists) throw new Error("Active tree not found");

    const tree = treeDoc.data() as Tree;
    const ideal = tree.goal.idealStates.find((i) => i.id === nodeId);

    if (!ideal) {
      throw new Error("Target node not found");
    }

    const result = {
      createdAt: new Date().toISOString(),
      id: randomUUID(),
      keywords,
      results,
      source: source,
    };

    ideal.researchResults.push(result);
    tree.updatedAt = new Date().toISOString();

    transaction.set(treeRef, tree);

    return tree;
  });
}

export async function setElementProposal(
  userId: string,
  nodeId: string,
  type: "decomposition" | "refinement",
  status: "processing" | "completed" | "failed",
  data?: any,
): Promise<void> {
  const tree = await getTree(userId);
  if (!tree) throw new Error("Tree not found");

  let target: Goal | IdealState | undefined;

  if (tree.goal.id === nodeId) {
    target = tree.goal;
  } else {
    target = tree.goal.idealStates.find((i) => i.id === nodeId);
  }

  if (target) {
    target.pendingProposal = {
      type,
      status,
      data: data || null,
      createdAt: new Date().toISOString(),
    };
    await saveTree(userId, tree);
  }
}
