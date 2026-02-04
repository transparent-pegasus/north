import * as ai from "../ai";
import * as decomposition from "../decomposition";
import * as treeModule from "../tree";
import type { Tree } from "../types";

// Mocking dependencies
jest.mock("../ai");
jest.mock("../tree");

describe("Decomposition Logic", () => {
  const userId = "test-user";
  const goalId = "test-goal";

  // Mock implementations
  const mockSaveTree = treeModule.saveTree as jest.MockedFunction<typeof treeModule.saveTree>;
  const mockGetTree = treeModule.getTree as jest.MockedFunction<typeof treeModule.getTree>;
  const mockSetElementProposal = treeModule.setElementProposal as jest.MockedFunction<
    typeof treeModule.setElementProposal
  >;
  const mockGenerateContemplation = ai.generateContemplation as jest.MockedFunction<
    typeof ai.generateContemplation
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockTree: Tree = {
    id: "tree-1",
    name: "Test Tree",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    goal: {
      id: goalId,
      content: "Main Goal",
      idealStates: [
        {
          id: "ideal-1",
          content: "Initial Ideal",
          condition: null,
          currentState: null,
          researchResults: [],
          researchSpec: null,
        },
      ],
      pendingProposal: null,
    },
  };

  it("should execute decomposition loop 3 times and return the final proposal", async () => {
    mockGetTree.mockResolvedValue(mockTree);

    // Mock AI responses for 3 loops
    mockGenerateContemplation
      .mockResolvedValueOnce({
        existing: [{ id: "ideal-1", action: "keep" }],
        additions: [{ ideal: "New Ideal 1" }],
      })
      .mockResolvedValueOnce({
        existing: [{ id: "ideal-1", action: "keep" }],
        additions: [{ ideal: "New Ideal 1 Modified" }],
      })
      .mockResolvedValueOnce({
        existing: [{ id: "ideal-1", action: "keep" }],
        additions: [{ ideal: "Final Ideal" }],
      });

    const result = await decomposition.decompose(userId, goalId, "goal", 5);

    expect(mockGetTree).toHaveBeenCalledWith(userId);
    // Should call AI 3 times
    expect(mockGenerateContemplation).toHaveBeenCalledTimes(3);

    // Verify the result matches the last loop output
    expect(result).toEqual({
      existing: [{ id: "ideal-1", action: "keep", newContent: undefined }],
      additions: [{ ideal: "Final Ideal", current: "", condition: "" }],
    });

    // Should set proposal status
    // 1. Initial processing
    expect(mockSetElementProposal).toHaveBeenCalledWith(
      userId,
      goalId,
      "decomposition",
      "processing",
    );
    // 2. Final completed
    expect(mockSetElementProposal).toHaveBeenCalledWith(
      userId,
      goalId,
      "decomposition",
      "completed",
      result,
    );
  });

  it("should apply decomposition correctly", async () => {
    mockGetTree.mockResolvedValue(mockTree);

    const proposal = {
      existing: [
        {
          id: "ideal-1",
          action: "modify" as const,
          newContent: "Modified Content",
        },
      ],
      additions: [
        {
          ideal: "Added Ideal",
          current: "Current State",
          condition: "Condition",
          research: {
            source: "arxiv",
            keywords: ["AI"],
          },
        },
      ],
    };

    const updatedTree = await decomposition.applyDecomposition(userId, goalId, proposal);

    // Check existing item modification
    const ideal1 = updatedTree.goal.idealStates.find((i) => i.id === "ideal-1");
    expect(ideal1?.content).toBe("Modified Content");

    // Check new item addition
    const addedIdeal = updatedTree.goal.idealStates.find((i) => i.content === "Added Ideal");
    expect(addedIdeal).toBeDefined();
    expect(addedIdeal?.currentState?.content).toBe("Current State");
    expect(addedIdeal?.condition?.content).toBe("Condition");
    expect(addedIdeal?.researchSpec).toEqual({
      source: "arxiv",
      keywords: ["AI"],
    });

    expect(mockSaveTree).toHaveBeenCalled();
  });
});
