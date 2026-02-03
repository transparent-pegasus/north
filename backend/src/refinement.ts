import { generateContemplation } from "./ai";
import { getTree, saveTree } from "./tree";

export async function suggestRefine(
  uid: string,
  elementId: string,
  elementType: "goal" | "ideal",
  instruction: string,
) {
  const tree = await getTree(uid);

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
      const proposal = {
        createdAt: new Date().toISOString(),
        data: result,
        type: "refinement" as const,
      };

      ideal.pendingProposal = proposal;
      await saveTree(uid, tree);
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
    const proposal = {
      createdAt: new Date().toISOString(),
      data: result,
      type: "refinement" as const,
    };

    if (elementType === "goal" && tree.goal.id === elementId) {
      tree.goal.pendingProposal = proposal;
    }
    await saveTree(uid, tree);
  }

  return result;
}

export async function applyRefine(
  uid: string,
  elementId: string,
  elementType: "goal" | "ideal",
  newContent: any, // Expecting RefinementData structure or partial
) {
  const tree = await getTree(uid);
  let updated = false;

  // newContent might be passed as simple string (legacy) or object (new)
  // But strictly speaking, caller should pass the suggestion list or map.
  // We'll assume the caller (ControlPanel) passes the applied suggestions array or values.
  // For simplicity, let's say 'newContent' argument holds the map of field->value to update.

  const updates = typeof newContent === "object" ? newContent : { content: newContent };

  if (elementType === "goal") {
    if (tree.goal.id === elementId) {
      if (updates.content) {
        tree.goal.content = updates.content;
      }
      tree.goal.pendingProposal = null; // Clear proposal
      updated = true;
    }
  } else {
    const ideal = tree.goal.idealStates.find((i) => i.id === elementId);

    if (ideal) {
      if (updates.content) ideal.content = updates.content;
      if (updates.condition) {
        if (!ideal.condition) ideal.condition = { content: "", id: `${elementId}-cond` }; // rudimentary id gen
        ideal.condition.content = updates.condition;
      }
      if (updates.currentState) {
        if (!ideal.currentState) ideal.currentState = { content: "", id: `${elementId}-curr` };
        ideal.currentState.content = updates.currentState;
      }
      ideal.pendingProposal = null; // Clear proposal
      updated = true;
    }
  }

  if (updated) {
    await saveTree(uid, tree);
  }

  return tree;
}
