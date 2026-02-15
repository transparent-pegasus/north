"use client";

import { Lock, Plus, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useModal } from "@/components/ModalProvider";
import { apiFetch } from "@/lib/api";
import type { Goal, IdealState, Tree } from "@/types";

interface TreeListProps {
  onNodeSelect: (
    node: {
      childCount?: number;
      condition?: string;
      currentState?: string;
      id: string;
      label?: string;
      pendingProposal?: any;
      researchSpec?: any;
      type: "goal" | "ideal";
    } | null,
  ) => void;
  onRefresh: () => void;
  processingNodes?: Set<string>;
  treeId?: string;
  tree: Tree | null;
  onUpdateTree: (tree: Tree | null) => void;
  isLoading: boolean;
  onAddTree?: () => void;
  isLimitReached?: boolean;
  selectedNodeId?: string;
}

export default function TreeList({
  onNodeSelect,
  onRefresh,
  processingNodes,
  tree,
  onUpdateTree,
  isLoading,
  onAddTree,
  isLimitReached,
  selectedNodeId,
}: TreeListProps) {
  const { showIdealStatePrompt } = useModal();

  useEffect(() => {
    if (!tree) return;
    const hasProcessing =
      tree.goal.pendingProposal?.status === "processing" ||
      tree.goal.idealStates.some((i) => i.pendingProposal?.status === "processing");

    if (hasProcessing) {
      const timer = setTimeout(() => {
        onRefresh();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [tree, onRefresh]);

  const handleSelect = (
    id: string,
    type: "goal" | "ideal",
    label?: string,
    researchSpec?: any,
    childCount?: number,
    pendingProposal?: any,
    condition?: string,
    currentState?: string,
  ) => {
    onNodeSelect({
      childCount,
      condition,
      currentState,
      id,
      label,
      pendingProposal,
      researchSpec,
      type,
    });
  };

  const handleAddElement = async (parentId: string) => {
    const data = await showIdealStatePrompt();

    if (!data) return;

    // Optimistic Update
    if (tree) {
      const tempId = `temp-${Date.now()}`;
      const newIdeal: IdealState = {
        id: tempId,
        content: data.content,
        condition: data.condition
          ? { id: `temp-cond-${Date.now()}`, content: data.condition }
          : null,
        currentState: data.currentState
          ? { id: `temp-curr-${Date.now()}`, content: data.currentState }
          : null,
        researchResults: [],
        researchSpec: null,
      };

      onUpdateTree({
        ...tree,
        goal: {
          ...tree.goal,
          idealStates: [...tree.goal.idealStates, newIdeal],
        },
      });
    }

    await apiFetch("/api/add-element", {
      body: JSON.stringify({ ...data, parentId }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    onRefresh();
  };

  const handleDeleteResearch = (nodeId: string, researchId: string) => {
    if (!tree) return;
    const newIdeals = tree.goal.idealStates.map((ideal) => {
      if (ideal.id !== nodeId) return ideal;

      return {
        ...ideal,
        researchResults: ideal.researchResults.filter((r) => r.id !== researchId),
      };
    });

    onUpdateTree({
      ...tree,
      goal: { ...tree.goal, idealStates: newIdeals },
    });
  };

  if (isLoading) {
    return <div className="p-4 text-center text-stone-400 text-sm">読み込み中...</div>;
  }

  if (!tree) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
        <button
          onClick={isLimitReached ? undefined : onAddTree}
          disabled={isLimitReached}
          className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
            isLimitReached
              ? "bg-stone-100 dark:bg-stone-800 cursor-not-allowed"
              : "bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 cursor-pointer"
          }`}
        >
          {isLimitReached ? (
            <Lock className="w-8 h-8 text-stone-300 dark:text-stone-600" />
          ) : (
            <Plus className="w-8 h-8 text-stone-400" />
          )}
        </button>
        <h2 className="text-xl font-bold text-stone-700 dark:text-stone-300 mb-2">
          {isLimitReached ? "作成上限に達しました" : "ゴールがありません"}
        </h2>
        <p className="text-stone-500 dark:text-stone-400 max-w-sm">
          {isLimitReached
            ? "新しいゴールを作成するには、既存のゴールを削除してください。"
            : "上のアイコンをクリックして、新しいゴールを作成しましょう。"}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto p-4">
      <div className="max-w-2xl mx-auto flex flex-col gap-3 pb-20">
        <GoalNode
          goal={tree.goal}
          selectedId={selectedNodeId || null}
          onSelect={handleSelect}
          onAdd={handleAddElement}
          onRefresh={onRefresh}
          onDeleteResearch={handleDeleteResearch}
          processingNodes={processingNodes}
        />
      </div>
    </div>
  );
}

// --- Components ---

interface NodeProps {
  onAdd: (parentId: string) => void;
  onSelect: (
    id: string,
    type: "goal" | "ideal",
    label?: string,
    researchSpec?: any,
    childCount?: number,
    pendingProposal?: any,
    condition?: string,
    currentState?: string,
  ) => void;
  selectedId: string | null;
  onRefresh: () => void;
  onDeleteResearch: (nodeId: string, researchId: string) => void;
  processingNodes?: Set<string>;
}

function AddButton({
  label,
  onClick,
  disabled,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`w-full py-1.5 text-[10px] font-medium rounded border border-dashed transition-all tracking-wide ${
        disabled
          ? "border-stone-100 dark:border-stone-800 text-stone-300 dark:text-stone-700 cursor-not-allowed"
          : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border-stone-200 dark:border-stone-700"
      }`}
    >
      + {label}
    </button>
  );
}

function GoalNode({ goal, onAdd, ...props }: { goal: Goal } & NodeProps) {
  const isSelected = props.selectedId === goal.id;
  const isProcessing =
    props.processingNodes?.has(goal.id) || goal.pendingProposal?.status === "processing";

  return (
    <div className={`flex flex-col gap-2 ${isProcessing ? "opacity-70 pointer-events-none" : ""}`}>
      <button
        onClick={() =>
          !isProcessing &&
          props.onSelect(
            goal.id,
            "goal",
            goal.content,
            undefined,
            goal.idealStates.length,
            goal.pendingProposal,
          )
        }
        disabled={isProcessing}
        className={`text-left w-full p-4 rounded-lg border transition-all relative ${
          isSelected
            ? "bg-stone-100 dark:bg-stone-800 border-stone-400 dark:border-stone-600"
            : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700"
        }`}
      >
        {/* Spinner logic below... actually we can simplify by wrapping entire node in pointer-events-none if goal is processing as per user request */}
        {/* But we need to show spinner on the Goal button specifically? Original code had it. */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-stone-950/50 rounded-lg z-10">
            <div className="w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">
          ゴール
        </span>
        <h2 className="text-base font-medium text-stone-800 dark:text-stone-100 mt-1">
          {goal.content}
        </h2>
        {goal.pendingProposal && !isProcessing && (
          <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold mt-1">
            <Sparkles className="w-3 h-3" />
            <span>提案あり</span>
          </div>
        )}
      </button>

      {/* Ideal States */}
      <div className="flex flex-col gap-4 pl-4 ml-2 border-l border-dashed border-stone-200 dark:border-stone-800">
        <AddButton
          onClick={() => onAdd(goal.id)}
          label="理想の状態を追加"
          disabled={isProcessing}
        />
        {goal.idealStates.map((ideal) => (
          <IdealStateNode
            key={ideal.id}
            ideal={ideal}
            onAdd={onAdd}
            isParentProcessing={isProcessing}
            {...props}
          />
        ))}
      </div>
    </div>
  );
}

interface ResearchResultItemProps {
  res: IdealState["researchResults"][0];
  nodeId: string;
  onRefresh: () => void;
  onDeleteResearch: (nodeId: string, researchId: string) => void;
}

function ResearchResultItem({ nodeId, onDeleteResearch, onRefresh, res }: ResearchResultItemProps) {
  const [expanded, setExpanded] = useState(false);
  const { showConfirm, showError } = useModal();
  const displayResults = expanded ? res.results : res.results.slice(0, 3);
  const hasMore = res.results.length > 3;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await showConfirm("このリサーチ結果を削除しますか？");

    if (!ok) return;

    try {
      // Optimistic Update
      onDeleteResearch(nodeId, res.id);

      const resp = await apiFetch("/research", {
        body: JSON.stringify({ nodeId, researchId: res.id }),
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      });

      if (!resp.ok) {
        throw new Error("Failed to delete");
      }
    } catch (err) {
      console.error(err);
      showError("削除に失敗しました");
      onRefresh(); // Revert/Sync on error
    }
  };

  return (
    <div className="text-xs group relative pr-6">
      <div className="text-blue-500 font-medium mb-0.5 flex items-center justify-between">
        <span>
          {res.source} ({res.results.length}件)
        </span>
      </div>

      <button
        onClick={handleDelete}
        className="absolute top-0 right-0 text-stone-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        title="リサーチ結果を削除"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {displayResults.map((item) => (
        <a
          key={item.url}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-stone-600 dark:text-stone-400 hover:text-blue-600 dark:hover:text-blue-400 truncate"
          onClick={(e) => e.stopPropagation()}
        >
          • {item.title}
        </a>
      ))}
      {hasMore && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
        >
          {expanded ? "▲ 折りたたむ" : `▼ 他${res.results.length - 3}件を表示`}
        </button>
      )}
    </div>
  );
}

interface IdealStateNodeProps extends NodeProps {
  ideal: IdealState;
  isParentProcessing?: boolean;
}

function IdealStateNode({ ideal, isParentProcessing, ...props }: IdealStateNodeProps) {
  const isSelected = props.selectedId === ideal.id;
  const isSelfProcessing =
    props.processingNodes?.has(ideal.id) || ideal.pendingProposal?.status === "processing";
  const isProcessing = isSelfProcessing || isParentProcessing;
  const hasResearch = ideal.researchResults && ideal.researchResults.length > 0;

  return (
    <div className={`flex flex-col gap-1 ${isProcessing ? "opacity-70 pointer-events-none" : ""}`}>
      <button
        onClick={() =>
          !isProcessing &&
          props.onSelect(
            ideal.id,
            "ideal",
            ideal.content,
            ideal.researchSpec,
            undefined,
            ideal.pendingProposal,
            ideal.condition?.content,
            ideal.currentState?.content,
          )
        }
        disabled={isProcessing}
        className={`text-left w-full p-3 rounded-lg border transition-all relative ${
          isSelected
            ? "bg-amber-50 dark:bg-amber-900/20 border-amber-400 dark:border-amber-700"
            : "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-900/30 hover:border-amber-300 dark:hover:border-amber-800"
        }`}
      >
        {isSelfProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-stone-950/50 rounded-lg z-10">
            <div className="w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-500 uppercase tracking-widest">
          理想の状態
        </span>
        <p className="text-sm font-medium text-stone-700 dark:text-stone-200 mt-1">
          {ideal.content}
        </p>
        {ideal.pendingProposal && !isProcessing && (
          <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold mt-1">
            <Sparkles className="w-3 h-3" />
            <span>提案あり</span>
          </div>
        )}

        {(ideal.currentState || ideal.condition) && (
          <div className="mt-2 pt-2 border-t border-amber-200/50 dark:border-amber-800/30 text-xs text-stone-500 dark:text-stone-400 space-y-0.5">
            {ideal.currentState && <div>現状: {ideal.currentState.content}</div>}
            {ideal.condition && <div>条件: {ideal.condition.content}</div>}
          </div>
        )}

        {/* Research Spec */}
        {ideal.researchSpec && (
          <div className="mt-2 pt-2 border-t border-amber-200/50 dark:border-amber-800/30 text-xs">
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              📚 {ideal.researchSpec.source}
            </span>
            <span className="text-stone-400 ml-2">[{ideal.researchSpec.keywords.join(", ")}]</span>
          </div>
        )}
      </button>

      {/* Research Results */}
      {hasResearch && (
        <div className="ml-4 pl-3 border-l-2 border-blue-200 dark:border-blue-800 space-y-1">
          {ideal.researchResults.map((res) => (
            <div key={res.id} className={isProcessing ? "pointer-events-none opacity-50" : ""}>
              <ResearchResultItem
                res={res}
                nodeId={ideal.id}
                onRefresh={props.onRefresh}
                onDeleteResearch={props.onDeleteResearch}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
