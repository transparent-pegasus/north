import { generateContemplation } from "./ai";
import { getTree, saveTree } from "./tree";

export async function suggestRefine(
  uid: string,
  elementId: string,
  elementType: "goal" | "ideal",
  instruction: string,
) {
  const tree = await getTree(uid);
  let content = "";

  if (elementType === "goal") {
    if (tree.goal.id === elementId) {
      content = tree.goal.content;
    }
  } else {
    // Search in ideal states
    const ideal = tree.goal.idealStates.find((i) => i.id === elementId);

    if (ideal) {
      content = ideal.content;
    }
  }

  if (!content) {
    throw new Error("Element not found");
  }

  const prompt = `
Original Content: "${content}"
User Instruction: "${instruction}"

Analyze the content and the instruction. Propose a refined version of the content.
State the reason for keeping parts of it, and the reason for changing parts of it.

Output JSON:
{
  "keepReason": "Reason for keeping...",
  "changeReason": "Reason for changing...",
  "newContent": "Refined content"
}
`;

  console.log("DEBUG: Refine Prompt:", prompt);
  const result = await generateContemplation(prompt, null);

  console.log("DEBUG: Refine Result:", result);

  if (result) {
    if (elementType === "goal" && tree.goal.id === elementId) {
      tree.goal.pendingProposal = {
        createdAt: new Date().toISOString(),
        data: result,
        type: "refinement",
      };
    } else {
      const ideal = tree.goal.idealStates.find((i) => i.id === elementId);

      if (ideal) {
        ideal.pendingProposal = {
          createdAt: new Date().toISOString(),
          data: result,
          type: "refinement",
        };
      }
    }
    await saveTree(uid, tree);
  }

  return result;
}

export async function applyRefine(
  uid: string,
  elementId: string,
  elementType: "goal" | "ideal",
  newContent: string,
) {
  const tree = await getTree(uid);
  let updated = false;

  if (elementType === "goal") {
    if (tree.goal.id === elementId) {
      tree.goal.content = newContent;
      tree.goal.pendingProposal = null; // Clear proposal
      updated = true;
    }
  } else {
    const ideal = tree.goal.idealStates.find((i) => i.id === elementId);

    if (ideal) {
      ideal.content = newContent;
      ideal.pendingProposal = null; // Clear proposal
      updated = true;
    }
  }

  if (updated) {
    await saveTree(uid, tree);
  }

  return tree;
}
