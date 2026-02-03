import { randomUUID } from "crypto";
import { generateContemplation } from "./ai";
import { getTree, saveTree } from "./tree";
import type { Goal, IdealState, ResearchSpec, SourceType, Tree } from "./types";

interface ElementEvaluation {
  id: string;
  action: "keep" | "modify";
  newContent?: string;
}

interface AdditionItem {
  ideal: string;
  current: string;
  condition: string;
  research?: {
    source: string;
    keywords: string[];
  };
}

interface DecomposeLoopResult {
  existing: ElementEvaluation[];
  additions: AdditionItem[];
}

const SOURCES_LIST: SourceType[] = [
  "openalex",
  "semantic_scholar",
  "arxiv",
  "pubmed",
  "wikipedia",
  "reddit",
  "sciencedaily",
  "phys_org",
  "mit_tech_review",
  "ieee_spectrum",
  "frontiers",
  "hackaday",
];

/**
 * Decompose a goal into ideal states with iterative refinement.
 */
export async function decompose(
  userId: string,
  targetId: string,
  type: "goal" | "ideal",
  maxItems: number = 5,
): Promise<DecomposeLoopResult | null> {
  if (type !== "goal") {
    return null;
  }

  const tree = await getTree(userId);

  if (tree.goal.id !== targetId) return null;

  const loops = 3;
  const addedIds: string[] = [];
  let finalProposal: DecomposeLoopResult | null = null;

  for (let loopIndex = 0; loopIndex < loops; loopIndex++) {
    const goal = tree.goal;
    const currentIdeals = goal.idealStates.map((i) => ({
      content: i.content,
      id: i.id,
    }));
    const existingCount = currentIdeals.length;
    const slotsAvailable = Math.max(0, maxItems - existingCount + addedIds.length);

    const prompt = buildPrompt(goal, currentIdeals, addedIds, slotsAvailable, loopIndex);

    console.log(`DEBUG: Decomposition Loop ${loopIndex + 1} Prompt:`, prompt);
    const result = await generateContemplation(prompt, null);

    console.log(`DEBUG: Decomposition Loop ${loopIndex + 1} Result:`, result);

    if (result) {
      finalProposal = parseResult(result);
      // Update local state for next loop iteration
      // (Simplified: we use the last valid proposal as the final one)
    }
  }

  if (finalProposal) {
    tree.goal.pendingProposal = {
      createdAt: new Date().toISOString(),
      data: finalProposal,
      type: "decomposition",
    };
    await saveTree(userId, tree);
  }

  return finalProposal;
}

export async function applyDecomposition(
  userId: string,
  targetId: string,
  proposal: DecomposeLoopResult,
): Promise<Tree> {
  const tree = await getTree(userId);

  if (tree.goal.id !== targetId) {
    throw new Error("Goal ID mismatch");
  }

  const goal = tree.goal;

  // Clear pending proposal
  goal.pendingProposal = null;

  // Apply modifications to existing elements
  for (const eval_ of proposal.existing) {
    if (eval_.action === "modify" && eval_.newContent) {
      const ideal = goal.idealStates.find((i) => i.id === eval_.id);

      if (ideal) ideal.content = eval_.newContent;
    }
  }

  // Apply additions
  for (const addition of proposal.additions) {
    const id = randomUUID();

    let researchSpec: ResearchSpec | null = null;

    if (
      addition.research?.source &&
      SOURCES_LIST.includes(addition.research.source as SourceType)
    ) {
      researchSpec = {
        keywords: addition.research.keywords || [],
        source: addition.research.source as SourceType,
      };
    }

    const newIdeal: IdealState = {
      condition: addition.condition ? { content: addition.condition, id: randomUUID() } : null,
      content: addition.ideal,
      currentState: addition.current ? { content: addition.current, id: randomUUID() } : null,
      id,
      researchResults: [],
      researchSpec,
    };

    goal.idealStates.push(newIdeal);
  }

  await saveTree(userId, tree);

  return tree;
}

function buildPrompt(
  goal: Goal,
  ideals: { id: string; content: string }[],
  addedIds: string[],
  slotsAvailable: number,
  loopIndex: number,
): string {
  const idealsList = ideals
    .map((i) => `- [${i.id}] "${i.content}" ${addedIds.includes(i.id) ? "(前回追加)" : "(既存)"}`)
    .join("\n");

  // Extract research results
  const researchContext = goal.idealStates
    .flatMap((ideal) => {
      if (!ideal.researchResults || ideal.researchResults.length === 0) return [];

      return ideal.researchResults.flatMap((res) =>
        res.results.slice(0, 3).map((item) => {
          return `- (Source: ${res.source}) [Relates to: "${ideal.content}"]: ${item.title} - ${item.snippet || "No snippet"}`;
        }),
      );
    })
    .join("\n");

  const loopContext =
    loopIndex === 0
      ? "初回評価: 既存の理想状態の維持/変更を判断し、不足分を追加してください。"
      : `再評価 (${loopIndex + 1}回目): 前回の提案を再検討し、より良い内容に改善してください。`;

  const sourcesDescription = `
Available research sources:
- openalex: Academic papers (general)
- semantic_scholar: Academic papers with citation analysis
- arxiv: Preprints (physics, CS, math, etc.)
- pubmed: Biomedical literature
- wikipedia: Encyclopedia
- reddit: Community discussions
- sciencedaily, phys_org, mit_tech_review, ieee_spectrum, frontiers, hackaday: Tech news/RSS
`;

  return `
Goal: "${goal.content}"
Current Ideal States:
${idealsList || "(なし)"}

Research Context (Use this to inform your decomposition and suggestions):
${researchContext || "(No research results available)"}

${loopContext}

追加可能な残りスロット: ${slotsAvailable}

${sourcesDescription}

Return JSON:
{
  "existing": [
    { "id": "element-id", "action": "keep" | "modify", "newContent": "modified text if action is modify" }
  ],
  "additions": [
    {
      "ideal": "理想の状態",
      "current": "現在の状態",
      "condition": "達成条件",
      "research": {
        "source": "arxiv",
        "keywords": ["keyword1", "keyword2"]
      }
    }
  ]
}

Rules:
- For each existing ideal state: "keep" or "modify" (with newContent)
- additions: up to ${slotsAvailable} new ideal states with current state, condition, and research spec
- research.source: choose the most appropriate source for each ideal state
- research.keywords: 2-3 specific keywords for searching
- Ensure all elements are specific and actionable
- UTILIZE the Research Context to verify feasibility or find better phrasing/concepts.
`;
}

function parseResult(result: unknown): DecomposeLoopResult {
  const existing: ElementEvaluation[] = [];
  const additions: AdditionItem[] = [];

  if (typeof result !== "object" || result === null) {
    return { additions, existing };
  }

  const r = result as Record<string, unknown>;

  if (Array.isArray(r.existing)) {
    for (const e of r.existing) {
      if (e && typeof e === "object" && "id" in e && "action" in e) {
        const evalItem: ElementEvaluation = {
          action: e.action === "modify" ? "modify" : "keep",
          id: String(e.id),
        };

        if ("newContent" in e && e.newContent !== null && e.newContent !== undefined) {
          evalItem.newContent = String(e.newContent);
        }

        existing.push(evalItem);
      }
    }
  }

  if (Array.isArray(r.additions)) {
    for (const a of r.additions) {
      if (a && typeof a === "object" && "ideal" in a) {
        const item: AdditionItem = {
          condition: "condition" in a ? String(a.condition) : "",
          current: "current" in a ? String(a.current) : "",
          ideal: String(a.ideal),
        };

        if ("research" in a && a.research && typeof a.research === "object") {
          const research = a.research as Record<string, unknown>;

          item.research = {
            keywords: Array.isArray(research.keywords) ? research.keywords.map(String) : [],
            source: String(research.source || ""),
          };
        }

        additions.push(item);
      }
    }
  }

  return { additions, existing };
}
