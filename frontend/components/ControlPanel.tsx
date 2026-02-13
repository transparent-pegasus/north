"use client";

import { BookOpen, Sparkles, Sprout } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useModal } from "@/components/ModalProvider";
import RefineProposalModal from "@/components/RefineProposalModal";
import ResearchModal from "@/components/ResearchModal";
import { apiFetch } from "@/lib/api";
import { config } from "@/lib/config";
import type { RefinementData, Tree } from "@/types";

interface DecompositionProposal {
  additions: { condition: string; current: string; ideal: string }[];
  existing: { action: "keep" | "modify"; id: string; newContent?: string }[];
}
interface ControlPanelProps {
  onDecompose: (keepSelection?: boolean) => void;
  selectedNode: {
    childCount?: number;
    condition?: string;
    currentState?: string;
    id: string;
    label?: string;
    content?: string;
    pendingProposal?: any;
    researchSpec?: any;
    type: "goal" | "ideal";
  } | null;
  tree: Tree | null;
  onUpdateTree: (tree: Tree | null) => void;
  setGlobalLoading: (loading: boolean | string) => void;
  onProcessingStart: (id: string) => void;
  onProcessingEnd: (id: string) => void;
  onClose?: () => void;
  onSwitchTree?: (id: string) => void;
  version: number;
}

export default function ControlPanel({
  onDecompose,
  selectedNode,
  tree,
  onUpdateTree,
  setGlobalLoading,
  onProcessingStart,
  onProcessingEnd,
  onClose,
  onSwitchTree,
  version,
}: ControlPanelProps) {
  const { showConfirm, showError } = useModal();
  const [loading, setLoading] = useState(false);
  const [contentInput, setContentInput] = useState("");
  const [conditionInput, setConditionInput] = useState("");
  const [currentStateInput, setCurrentStateInput] = useState("");
  const [refineInstruction, setRefineInstruction] = useState("");
  const [maxItems, setMaxItems] = useState<number | string>(3);
  const [suggestion, setSuggestion] = useState<RefinementData | null>(null);
  const [decomposeProposal, setDecomposeProposal] = useState<DecompositionProposal | null>(null);
  const [selectedAdditionIndices, setSelectedAdditionIndices] = useState<Set<number>>(new Set());
  const [selectedModificationIds, setSelectedModificationIds] = useState<Set<string>>(new Set());
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);
  const [usage, setUsage] = useState({ decompose: 0, refine: 0, research: 0 });

  const LIMITS = config.limits;

  const fetchUsage = useCallback(async () => {
    try {
      const res = await apiFetch("/api/user/limits");

      if (res.ok) {
        const data = await res.json();

        setUsage(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (selectedNode?.label || selectedNode?.content) {
      setContentInput(selectedNode.label || selectedNode.content || "");
    } else {
      setContentInput("");
    }

    if (selectedNode?.condition) {
      // condition can be string or object { id, content }
      const anyCond = selectedNode.condition as any;
      setConditionInput(
        typeof anyCond === "object" && anyCond.content
          ? anyCond.content
          : typeof anyCond === "string"
            ? anyCond
            : "",
      );
    } else {
      setConditionInput("");
    }

    if (selectedNode?.currentState) {
      // currentState can be string or object { id, content }
      const anyState = selectedNode.currentState as any;
      setCurrentStateInput(
        typeof anyState === "object" && anyState.content
          ? anyState.content
          : typeof anyState === "string"
            ? anyState
            : "",
      );
    } else {
      setCurrentStateInput("");
    }

    // Reset state
    setSuggestion(null);
    setDecomposeProposal(null);
    setIsRefineModalOpen(false);

    // Check for pending proposals
    if (selectedNode?.pendingProposal) {
      const proposal = selectedNode.pendingProposal;

      // Skip if processing or failed
      if (proposal.status === "processing" || proposal.status === "failed") {
        return;
      }

      if (proposal.type === "decomposition") {
        const data = proposal.data;

        if (data && Array.isArray(data.existing) && Array.isArray(data.additions)) {
          setDecomposeProposal(data);
          // Default select all
          setSelectedAdditionIndices(new Set((data.additions || []).map((_: any, i: number) => i)));
          setSelectedModificationIds(
            new Set(
              (data.existing || []).filter((e: any) => e.action === "modify").map((e: any) => e.id),
            ),
          );
        }
      } else if (proposal.type === "refinement") {
        const data = proposal.data;

        if (data?.suggestions || data?.refinedIdealState) {
          setSuggestion(data);
          // Don't auto-open modal to avoid annoying popups on navigation,
          // but we could. User asked to "restore".
          // Let's open it if it's refinement.
          setIsRefineModalOpen(true);
        }
      }
    }

    // Use version to trigger refetch
    const _v = version;
    fetchUsage();
  }, [selectedNode, fetchUsage, version]);

  const withLoading = async (fn: () => Promise<void>) => {
    setLoading(true);
    setGlobalLoading(true);
    try {
      await fn();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedNode || !contentInput || !tree) return;
    setLoading(true);

    // Optimistic Update
    if (selectedNode.type === "goal") {
      onUpdateTree({
        ...tree,
        goal: { ...tree.goal, content: contentInput },
      });
    } else {
      const newIdeals = tree.goal.idealStates.map((ideal) => {
        if (ideal.id !== selectedNode.id) return ideal;
        return {
          ...ideal,
          content: contentInput,
          condition: ideal.condition
            ? { ...ideal.condition, content: conditionInput }
            : conditionInput
              ? { id: `temp-cond-${Date.now()}`, content: conditionInput }
              : null,
          currentState: ideal.currentState
            ? { ...ideal.currentState, content: currentStateInput }
            : currentStateInput
              ? { id: `temp-curr-${Date.now()}`, content: currentStateInput }
              : null,
        };
      });
      onUpdateTree({
        ...tree,
        goal: { ...tree.goal, idealStates: newIdeals },
      });
    }

    try {
      await apiFetch("/api/element", {
        body: JSON.stringify({
          condition: conditionInput,
          content: contentInput,
          currentState: currentStateInput,
          id: selectedNode.id,
          type: selectedNode.type,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      onDecompose(true);
    } catch (e) {
      console.error(e);
      onDecompose(true); // Sync back on error
    } finally {
      setLoading(false);
    }
  };

  const handleError = async (data: any, defaultMsg: string) => {
    if (data.code === "QUOTA_EXCEEDED") {
      await showError(
        "AIの利用制限に達しました。現在無料版を提供しており、多くのリクエストを受け取っています。開発へのご理解とご協力に感謝いたします。しばらく時間をおいてから再度お試しください。",
      );
    } else {
      await showError(`${defaultMsg}: ${data.error || "不明なエラー"}`);
    }
  };

  const handleDelete = async () => {
    if (!selectedNode || selectedNode.type === "goal" || !tree) return;
    const ok = await showConfirm("この要素を削除しますか？");

    if (!ok) return;
    setLoading(true);

    // Optimistic Update
    const newIdeals = tree.goal.idealStates.filter((ideal) => ideal.id !== selectedNode.id);
    onUpdateTree({
      ...tree,
      goal: { ...tree.goal, idealStates: newIdeals },
    });

    try {
      const res = await apiFetch("/api/element", {
        body: JSON.stringify({
          id: selectedNode.id,
          type: selectedNode.type,
        }),
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        await handleError(data, "削除に失敗しました");
        onDecompose(); // Sync back
      } else {
        onDecompose();
      }
    } catch (e) {
      console.error(e);
      onDecompose(); // Sync back
    } finally {
      setLoading(false);
    }
  };

  const handleDecompose = async () => {
    if (!selectedNode) return;

    // Start background processing
    const nodeId = selectedNode.id;
    const currentNodeType = selectedNode.type;
    const currentMaxItems = Number(maxItems) || 5;
    onProcessingStart(nodeId);

    // Show dismissible message (Wait, we rely on Parent to make it dismissible or non-blocking)
    // We pass a special string "Decomposing:BACKGROUND" or similar if we want special handling?
    // Or just "Decomposing" and let parent handle it.
    // NOTE: setGlobalLoading("Decomposing") creates the overlay.
    // We want to make it dismissible.
    setGlobalLoading("Decomposing");

    try {
      // Don't await in a way that blocks this function if we want to return?
      // No, we want to execute the request.
      const res = await apiFetch("/api/decompose", {
        body: JSON.stringify({
          id: nodeId,
          maxItems: currentMaxItems,
          type: currentNodeType,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
        timeout: 120000,
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Decomposition failed:", data);
        await handleError(data, "分解に失敗しました");
        return;
      }

      // If we are still looking at the same node, update UI.
      if (selectedNode && selectedNode.id === nodeId) {
        if (data && Array.isArray(data.existing) && Array.isArray(data.additions)) {
          setDecomposeProposal(data);
          // Default select all
          setSelectedAdditionIndices(new Set((data.additions || []).map((_: any, i: number) => i)));
          setSelectedModificationIds(
            new Set(
              (data.existing || []).filter((e: any) => e.action === "modify").map((e: any) => e.id),
            ),
          );
          fetchUsage();
        } else {
          console.warn("Invalid decomposition data:", data);
          await showError("有効な提案を受け取れませんでした。もう一度試してください。");
        }
      }
      // Regardless, refresh tree (to update node status if needed or to ensure consistency)
      onDecompose(true);
    } catch (e) {
      console.error(e);
      await showError("分解処理中にエラーが発生しました。");
    } finally {
      // Clean up
      onProcessingEnd(nodeId);
      // We don't unset global loading here if we rely on the dismiss button?
      // Actually we MUST unset it if it's still open.
      setGlobalLoading(false);
    }
  };

  const handleApplyDecomposition = () =>
    withLoading(async () => {
      if (!selectedNode || !decomposeProposal) return;
      setGlobalLoading("Applying");

      const filteredProposal = {
        additions: decomposeProposal.additions.filter((_: any, i: number) =>
          selectedAdditionIndices.has(i),
        ),
        existing: decomposeProposal.existing.map((e: any) => ({
          ...e,
          action: selectedModificationIds.has(e.id) ? e.action : "keep",
        })),
      };

      const res = await apiFetch("/api/apply-decomposition", {
        body: JSON.stringify({
          id: selectedNode.id,
          proposal: filteredProposal,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();

        await handleError(data, "適用に失敗しました");
      } else {
        setDecomposeProposal(null);
        onDecompose(true);
        fetchUsage();
      }
    });

  const handleSuggestRefine = async () => {
    if (!selectedNode || !refineInstruction) return;

    const nodeId = selectedNode.id;
    onProcessingStart(nodeId);
    setGlobalLoading("Refining");

    try {
      const res = await apiFetch("/api/suggest-refine", {
        body: JSON.stringify({
          id: nodeId,
          instruction: refineInstruction,
          type: selectedNode.type,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
        timeout: 120000,
      });
      const data = await res.json();

      if (!res.ok) {
        await handleError(data, "提案の取得に失敗しました");
        return;
      }

      if (!data || (!data.suggestions && !data.refinedIdealState)) {
        await showError("有効な提案を受け取れませんでした。AIの出力を確認してください。");
        return;
      }

      setSuggestion(data);
      setIsRefineModalOpen(true);
      fetchUsage();
    } catch (e) {
      console.error(e);
      await showError("提案処理中にエラーが発生しました。");
    } finally {
      onProcessingEnd(nodeId);
      setGlobalLoading(false);
    }
  };

  const handleApplyRefine = () =>
    withLoading(async () => {
      if (!selectedNode || !suggestion) return;
      setGlobalLoading("Applying");

      const updates: any = {};
      if (suggestion.refinedIdealState !== undefined) {
        updates.content = suggestion.refinedIdealState;
        updates.currentState = suggestion.refinedCurrentState;
        updates.condition = suggestion.refinedCondition;
      } else if (suggestion.suggestions) {
        suggestion.suggestions.forEach((s) => {
          updates[s.field] = s.value; // Map 'content', 'condition', 'currentState' strings
        });
      }

      // Optimistic Update
      if (tree) {
        if (selectedNode.type === "goal") {
          onUpdateTree({
            ...tree,
            goal: { ...tree.goal, content: updates.content || tree.goal.content },
          });
        } else {
          const newIdeals = tree.goal.idealStates.map((ideal) => {
            if (ideal.id !== selectedNode.id) return ideal;

            // Helper to update sub-object or create it
            const newCondition =
              updates.condition !== undefined
                ? ideal.condition
                  ? { ...ideal.condition, content: updates.condition }
                  : updates.condition
                    ? { id: `temp-c-${Date.now()}`, content: updates.condition }
                    : null
                : ideal.condition;

            const newCurrentState =
              updates.currentState !== undefined
                ? ideal.currentState
                  ? { ...ideal.currentState, content: updates.currentState }
                  : updates.currentState
                    ? { id: `temp-s-${Date.now()}`, content: updates.currentState }
                    : null
                : ideal.currentState;

            return {
              ...ideal,
              content: updates.content !== undefined ? updates.content : ideal.content,
              condition: newCondition,
              currentState: newCurrentState,
            };
          });

          onUpdateTree({
            ...tree,
            goal: { ...tree.goal, idealStates: newIdeals },
          });
        }
      }

      const res = await apiFetch("/api/apply-refine", {
        body: JSON.stringify({
          id: selectedNode.id,
          newContent: updates,
          type: selectedNode.type,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();

        await handleError(data, "適用に失敗しました");
      } else {
        setSuggestion(null);
        setRefineInstruction("");
        setIsRefineModalOpen(false);
        onDecompose(true);
      }
    });

  if (!selectedNode) {
    return (
      <div className="h-full flex items-center justify-center p-6 border border-dashed border-stone-300 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-900/50">
        <p className="text-stone-400 text-xs text-center tracking-wide">ノードを選択</p>
      </div>
    );
  }

  const cardClass =
    "p-3 bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800";

  return (
    <div className="flex flex-col gap-3">
      {/* Primary Card: Element Edit */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">
            要素の編集
          </span>
        </div>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="input-content"
              className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1"
            >
              {selectedNode.type === "goal" ? "ゴール" : "理想の状態"}
            </label>
            <input
              id="input-content"
              type="text"
              value={contentInput}
              onChange={(e) => setContentInput(e.target.value)}
              placeholder={selectedNode.type === "goal" ? "ゴールの内容を入力" : "理想の状態を入力"}
              className="w-full px-3 py-2 text-sm rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-1 focus:ring-stone-400 outline-none text-stone-800 dark:text-stone-100"
            />
          </div>
          {selectedNode.type === "ideal" && (
            <>
              <div>
                <label
                  htmlFor="input-condition"
                  className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1"
                >
                  条件
                </label>
                <input
                  id="input-condition"
                  type="text"
                  value={conditionInput}
                  onChange={(e) => setConditionInput(e.target.value)}
                  placeholder="条件を入力"
                  className="w-full px-3 py-2 text-sm rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-1 focus:ring-stone-400 outline-none text-stone-800 dark:text-stone-100"
                />
              </div>
              <div>
                <label
                  htmlFor="input-current"
                  className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1"
                >
                  現在の状態
                </label>
                <input
                  id="input-current"
                  type="text"
                  value={currentStateInput}
                  onChange={(e) => setCurrentStateInput(e.target.value)}
                  placeholder="現在の状態を入力"
                  className="w-full px-3 py-2 text-sm rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-1 focus:ring-stone-400 outline-none text-stone-800 dark:text-stone-100"
                />
              </div>
            </>
          )}
          <button
            disabled={loading}
            onClick={handleUpdate}
            className="w-full py-2 text-sm font-medium bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 rounded hover:bg-stone-700 dark:hover:bg-stone-200 disabled:opacity-40"
          >
            {loading ? "..." : "更新"}
          </button>
        </div>
      </div>

      {/* Decompose Card */}
      {selectedNode.type === "goal" && (
        <div className={cardClass}>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            {selectedNode.childCount && selectedNode.childCount > 0
              ? "要素の再構成提案"
              : "要素の分解提案"}
          </div>
          <p className="text-[10px] text-stone-400 dark:text-stone-500 mb-2 leading-relaxed">
            {selectedNode.childCount && selectedNode.childCount > 0
              ? "現在の要素をAIが分析し、具体的な構成要素への再分解・置換を提案します。"
              : "現在の要素をAIが分析し、具体的な構成要素への詳細な分解を提案します。"}
          </p>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-stone-400">最大数</span>
            <input
              type="number"
              min={1}
              max={20}
              value={maxItems}
              onChange={(e) => setMaxItems(e.target.value)}
              className="w-16 px-2 py-1 text-sm text-center rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-100"
            />
          </div>
          <button
            disabled={loading}
            onClick={() => {
              if (usage.decompose >= LIMITS.decompose) {
                showError("本日の分解回数制限(3回)に達しました。明日またご利用ください。");

                return;
              }
              handleDecompose();
            }}
            className={`w-full py-2 text-sm font-medium rounded disabled:opacity-40 transition-colors ${
              usage.decompose >= LIMITS.decompose
                ? "bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed"
                : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
            }`}
          >
            {selectedNode.childCount && selectedNode.childCount > 0 ? "再分解を実行" : "分解を実行"}
            {usage.decompose >= LIMITS.decompose && (
              <span className="ml-2 text-xs opacity-70">(制限到達)</span>
            )}
          </button>

          {decomposeProposal && (
            <div className="mt-3 p-2 bg-stone-50 dark:bg-stone-800 rounded border border-stone-200 dark:border-stone-700 space-y-3 text-xs">
              <div className="font-semibold text-stone-600 dark:text-stone-300">置換の確認</div>

              {decomposeProposal.existing.some((e) => e.action === "modify") && (
                <div className="space-y-2">
                  <div className="text-[10px] text-stone-400 font-bold uppercase">
                    既存要素の修正
                  </div>
                  {decomposeProposal.existing
                    .filter((e) => e.action === "modify")
                    .map((e) => (
                      <label
                        className="flex items-start gap-2 p-1.5 hover:bg-stone-100 dark:hover:bg-stone-900 rounded cursor-pointer transition-colors"
                        key={e.id}
                      >
                        <input
                          checked={selectedModificationIds.has(e.id)}
                          className="mt-1 accent-amber-500"
                          onChange={() => {
                            const next = new Set(selectedModificationIds);

                            if (next.has(e.id)) next.delete(e.id);
                            else next.add(e.id);
                            setSelectedModificationIds(next);
                          }}
                          type="checkbox"
                        />
                        <div className="text-stone-800 dark:text-stone-200 leading-snug">
                          {e.newContent}
                        </div>
                      </label>
                    ))}
                </div>
              )}

              {decomposeProposal.additions.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] text-stone-400 font-bold uppercase">
                    追加される要素 ({decomposeProposal.additions.length})
                  </div>
                  {decomposeProposal.additions.map((a, idx) => (
                    <label
                      className="flex items-start gap-2 p-1.5 hover:bg-stone-100 dark:hover:bg-stone-900 rounded cursor-pointer transition-colors"
                      key={a.ideal}
                    >
                      <input
                        checked={selectedAdditionIndices.has(idx)}
                        className="mt-1 accent-green-600"
                        onChange={() => {
                          const next = new Set(selectedAdditionIndices);

                          if (next.has(idx)) next.delete(idx);
                          else next.add(idx);
                          setSelectedAdditionIndices(next);
                        }}
                        type="checkbox"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-stone-800 dark:text-stone-200 leading-snug">
                          {a.ideal}
                        </div>
                        <div className="text-stone-500 dark:text-stone-500 text-[10px] mt-0.5">
                          現状: {a.current}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleApplyDecomposition}
                  className="flex-1 py-1 text-xs font-medium bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 rounded hover:bg-stone-700 dark:hover:bg-stone-200"
                >
                  適用
                </button>
                <button
                  onClick={() => setDecomposeProposal(null)}
                  className="flex-1 py-1 text-xs font-medium text-stone-500 border border-stone-200 dark:border-stone-700 rounded hover:bg-stone-50 dark:hover:bg-stone-900"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Refine Card */}
      <div className={cardClass}>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          要素の修正提案
        </div>
        <p className="text-[10px] text-stone-400 dark:text-stone-500 mb-2 leading-relaxed">
          AIとの対話を通じて、この要素の内容を置換することを提案します。
        </p>
        <div className="space-y-2">
          <textarea
            value={refineInstruction}
            onChange={(e) => setRefineInstruction(e.target.value)}
            placeholder="議論を通じてこの要素をどのように変更したいか入力してください"
            rows={3}
            style={{ height: "auto", minHeight: "4.5rem" }}
            className="w-full px-3 py-2 text-sm rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-100 resize-y"
          />
          <button
            onClick={() => {
              if (usage.refine >= LIMITS.refine) {
                showError("本日の修正提案回数制限(3回)に達しました。明日またご利用ください。");

                return;
              }
              handleSuggestRefine();
            }}
            disabled={loading || !refineInstruction}
            className={`w-full py-2 text-sm font-medium rounded disabled:opacity-40 transition-colors ${
              usage.refine >= LIMITS.refine
                ? "bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed"
                : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
            }`}
          >
            提案を取得
            {usage.refine >= LIMITS.refine && (
              <span className="ml-2 text-xs opacity-70">(制限到達)</span>
            )}
          </button>
        </div>
      </div>

      {/* Research Card */}
      {selectedNode.type === "ideal" && (
        <div className={cardClass}>
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2">
            アクション
          </div>
          <div className="space-y-2">
            <button
              onClick={() => setIsResearchModalOpen(true)}
              className="w-full py-2 text-sm font-medium rounded disabled:opacity-40 flex items-center justify-center gap-2 transition-colors bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30"
            >
              <BookOpen className="w-4 h-4" />
              リサーチ
            </button>
            <div className="border-t border-stone-100 dark:border-stone-800 my-2" />
            <button
              onClick={async () => {
                const ok = await showConfirm(
                  "この理想の状態を新しいゴールの起点としてツリーを作成しますか？",
                );

                if (!ok) return;
                setLoading(true);
                setGlobalLoading(true);
                try {
                  // Logic to find current tree ID?
                  // We don't have current tree ID in ControlPanel props.
                  // But backend promoteIdealToGoal needs parentTreeId.
                  // We rely on backend getTree() defaulting to active tree if we don't pass ID?
                  // But promoteIdealToGoal takes paremtTreeId.
                  // Ideally we should pass treeId to ControlPanel.
                  // WITHOUT treeId, let's try passing empty string and letting backend handle it or fetching active tree first.
                  // Wait, current backend api implementation defaults to active tree if id is missing in getTree logic.
                  // BUT promoteIdealToGoal logic: const parentTree = await getTree(parentTreeId);
                  // if parentTreeId is undefined -> getTree(undefined) -> active tree.
                  // So passing undefined/null should work if we change frontend to allow it.
                  // BUT my frontend hook call needs to be correct.
                  // I will assume backend handles it or I will pass treeIndex.activeTreeId via props if needed.
                  // Actually, I can use a hack: pass "" as treeId, and backend getTree("") returns active tree.
                  const res = await apiFetch("/api/promote", {
                    body: JSON.stringify({
                      idealId: selectedNode.id,
                      treeId: "",
                    }),
                    headers: { "Content-Type": "application/json" },
                    method: "POST",
                  });

                  if (res.ok) {
                    const data = await res.json();
                    if (data.id && onSwitchTree) {
                      onSwitchTree(data.id);
                    } else {
                      onDecompose(true);
                    }
                    onClose?.();
                  } else {
                    onDecompose(true);
                  }
                } catch (e) {
                  console.error(e);
                  // alert("失敗しました");
                } finally {
                  setLoading(false);
                  setGlobalLoading(false);
                }
              }}
              disabled={loading}
              className="w-full py-2 text-sm font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 border border-amber-200 dark:border-amber-800 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Sprout className="w-4 h-4" />
              新しいツリーとして独立
            </button>
          </div>
        </div>
      )}

      {/* Delete Card */}
      {selectedNode.type !== "goal" && (
        <div className={cardClass}>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="w-full py-2 text-sm font-medium text-red-500 border border-red-200 dark:border-red-900/50 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40"
          >
            この要素を削除
          </button>
        </div>
      )}

      <ResearchModal
        isOpen={isResearchModalOpen}
        onClose={() => setIsResearchModalOpen(false)}
        nodeId={selectedNode.id}
        initialSpec={selectedNode.researchSpec}
        tree={tree}
        onUpdateTree={onUpdateTree}
        onResearchComplete={() => {
          onDecompose(false);
          setIsResearchModalOpen(false);
          fetchUsage();
        }}
        setGlobalLoading={setGlobalLoading}
        isResearchLimitReached={usage.research >= LIMITS.research}
      />

      <RefineProposalModal
        isOpen={isRefineModalOpen}
        onClose={() => setIsRefineModalOpen(false)}
        onApply={handleApplyRefine}
        currentContent={selectedNode.label || ""}
        suggestion={suggestion}
        currentCondition={selectedNode.condition}
        currentCurrentState={selectedNode.currentState}
      />
    </div>
  );
}
