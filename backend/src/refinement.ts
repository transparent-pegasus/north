import { generateContemplation } from "./ai";
import { getTree, saveTree, setElementProposal } from "./tree";

export async function suggestRefine(
  uid: string,
  elementId: string,
  elementType: "goal" | "ideal",
  instruction: string,
) {
  // Set processing status
  await setElementProposal(uid, elementId, "refinement", "processing");

  try {
    const tree = await getTree(uid);
    if (!tree) throw new Error("Tree not found");

    if (elementType === "ideal") {
      // --- IDEAL STATE REFINEMENT (Holistic) ---
      const ideal = tree.goal.idealStates.find((i) => i.id === elementId);

      if (!ideal) throw new Error("Ideal state not found");

      const prompt = `
Target Element: Ideal State
- Content (Ideal State): "${ideal.content}"
- Current State: "${ideal.currentState?.content || "(Unspecified)"}"
- Condition: "${ideal.condition?.content || "(Unspecified)"}"

User Instruction: "${instruction}"

Task:
Analyze the Ideal State, Current State, and Condition together. Propose a refined version of ALL three fields based on the user's instruction.
Even if a field does not need changing, you must provide the text (original or refined).
You MUST provide the "維持すべき理由" (reason for keeping) and "変更すべき理由" (reason for changing) in Japanese.
Do NOT include any English translation or explanation for the reasons. Output ONLY Japanese for reasons.

Output JSON:
{
  "refinedIdealState": "Refined content string",
  "refinedCurrentState": "Refined current state string (or empty if not applicable)",
  "refinedCondition": "Refined condition string (or empty if not applicable)",
  "reasonToKeep": "維持すべき理由 (Japanese)",
  "reasonToChange": "変更すべき理由 (Japanese)"
}
`;

      console.log("DEBUG: Ideal Refine Prompt:", prompt);
      const result = await generateContemplation(prompt, null);

      console.log("DEBUG: Ideal Refine Result:", result);

      if (result) {
        await setElementProposal(uid, elementId, "refinement", "completed", result);
      } else {
        await setElementProposal(uid, elementId, "refinement", "failed");
      }

      return result;
    }

    // --- GOAL REFINEMENT (Legacy / Single Field) ---
    const fields: { name: string; key: string; value: string }[] = [];

    if (elementType === "goal") {
      if (tree.goal.id === elementId) {
        fields.push({
          key: "content",
          name: "Goal Content",
          value: tree.goal.content,
        });
      }
    }

    if (fields.length === 0) {
      throw new Error("Element not found");
    }

    const fieldsText = fields.map((f) => `- ${f.name} (${f.key}): "${f.value}"`).join("\n");

    const prompt = `
Target Elements:
${fieldsText}

User Instruction: "${instruction}"

Task:
Analyze the target elements and the instruction. Propose refined versions for each relevant field.
You MUST provide the "維持すべき理由" (reason for keeping) and "変更すべき理由" (reason for changing) in Japanese.
Do NOT include any English translation or explanation for the reasons. Output ONLY Japanese for reasons.

Output JSON:
{
  "suggestions": [
    {
      "field": "content",
      "value": "Refined content string",
      "keepReason": "維持すべき理由 (Japanese)",
      "changeReason": "変更すべき理由 (Japanese)"
    }
  ]
}
`;

    console.log("DEBUG: Refine Prompt:", prompt);
    const result = await generateContemplation(prompt, null);

    console.log("DEBUG: Refine Result:", result);

    if (result) {
      await setElementProposal(uid, elementId, "refinement", "completed", result);
    } else {
      await setElementProposal(uid, elementId, "refinement", "failed");
    }

    return result;
  } catch (error) {
    console.error("Refinement error:", error);
    await setElementProposal(uid, elementId, "refinement", "failed");
    throw error;
  }
}

export async function applyRefine(
  uid: string,
  elementId: string,
  elementType: "goal" | "ideal",
  newContent: any,
) {
  const tree = await getTree(uid);
  if (!tree) throw new Error("Tree not found");

  let updated = false;

  const updates = typeof newContent === "object" ? newContent : { content: newContent };

  if (elementType === "goal") {
    if (tree.goal.id === elementId) {
      if (updates.content) {
        tree.goal.content = updates.content;
      }
      tree.goal.pendingProposal = null;
      updated = true;
    }
  } else {
    const ideal = tree.goal.idealStates.find((i) => i.id === elementId);

    if (ideal) {
      if (updates.content) ideal.content = updates.content;
      if (updates.condition) {
        if (!ideal.condition) ideal.condition = { content: "", id: `${elementId}-cond` };
        ideal.condition.content = updates.condition;
      }
      if (updates.currentState) {
        if (!ideal.currentState) ideal.currentState = { content: "", id: `${elementId}-curr` };
        ideal.currentState.content = updates.currentState;
      }
      ideal.pendingProposal = null;
      updated = true;
    }
  }

  if (updated) {
    await saveTree(uid, tree);
  }

  return tree;
}
