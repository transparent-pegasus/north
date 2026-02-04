"use client";

import { useEffect, useState } from "react";

import { useModal } from "@/components/ModalProvider";
import { apiFetch } from "@/lib/api";
import { AVAILABLE_SOURCES, type ResearchSpec, type SourceType, type Tree } from "@/types";

interface ResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSpec?: ResearchSpec | null;
  nodeId: string;
  tree: Tree | null;
  onUpdateTree: (tree: Tree | null) => void;
  onResearchComplete: () => void;
  setGlobalLoading: (loading: boolean | string) => void;
}

export default function ResearchModal({
  initialSpec,
  isOpen,
  nodeId,
  tree,
  onUpdateTree,
  onClose,
  onResearchComplete,
  setGlobalLoading,
}: ResearchModalProps) {
  const { showError } = useModal();
  const [activeTab, setActiveTab] = useState<"auto" | "manual">("auto");

  // Auto Search State
  const [source, setSource] = useState<SourceType>("openalex");
  const [keywords, setKeywords] = useState<string>("");

  // Manual Entry State
  const [manualTitle, setManualTitle] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [manualSnippet, setManualSnippet] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialSpec) {
        setSource(initialSpec.source);
        setKeywords(initialSpec.keywords.join(", "));
        setActiveTab("auto");
      } else {
        setSource("openalex");
        setKeywords("");
        setActiveTab("auto");
      }
      // Reset manual fields
      setManualTitle("");
      setManualUrl("");
      setManualSnippet("");
    }
  }, [isOpen, initialSpec]);

  const handleAutoResearch = async () => {
    if (!keywords.trim()) return;
    setLoading(true);
    setGlobalLoading("リサーチを実行中...");
    try {
      const spec: ResearchSpec = {
        keywords: keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        source,
      };

      const res = await apiFetch("/api/research/auto", {
        body: JSON.stringify({ nodeId, spec }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Research failed");
      }

      if (data.count === 0) {
        await showError("候補が見つかりませんでした。キーワードを変更してください。");
      } else {
        onResearchComplete();
        onClose();
      }
    } catch (e: any) {
      console.error(e);
      await showError(`リサーチに失敗しました: ${e.message || "Unknown error"}`);
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  };

  const handleManualAdd = async () => {
    if (!manualTitle.trim() || !manualUrl.trim() || !tree) return;
    setLoading(true);

    // Optimistic Update
    const newIdeals = tree.goal.idealStates.map((ideal) => {
      if (ideal.id !== nodeId) return ideal;

      const newResult = {
        id: `temp-res-${Date.now()}`,
        source: "manual",
        keywords: [],
        results: [{ title: manualTitle, url: manualUrl, snippet: manualSnippet }],
        createdAt: new Date().toISOString(),
      };

      return {
        ...ideal,
        researchResults: [...(ideal.researchResults || []), newResult],
      };
    });

    onUpdateTree({
      ...tree,
      goal: { ...tree.goal, idealStates: newIdeals },
    });

    try {
      const res = await apiFetch("/api/research/manual", {
        body: JSON.stringify({
          nodeId,
          snippet: manualSnippet,
          title: manualTitle,
          url: manualUrl,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add manual entry");
      }

      onResearchComplete();
      onClose();
    } catch (e: any) {
      console.error(e);
      await showError(`保存に失敗しました: ${e.message || "Unknown error"}`);
      onResearchComplete(); // Re-sync
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-stone-900 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center bg-stone-50 dark:bg-stone-950/50 rounded-t-xl">
          <h2 className="font-semibold text-lg text-stone-800 dark:text-stone-100">
            リサーチアシスタント
          </h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 dark:border-stone-800">
          <button
            onClick={() => setActiveTab("auto")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "auto"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
            }`}
          >
            自動検索
          </button>
          <button
            onClick={() => setActiveTab("manual")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "manual"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
            }`}
          >
            手動追加
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === "auto" ? (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="research-source"
                  className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"
                >
                  ソース
                </label>
                <select
                  id="research-source"
                  value={source}
                  onChange={(e) => setSource(e.target.value as SourceType)}
                  className="w-full p-2 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                >
                  {AVAILABLE_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="research-keywords"
                  className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"
                >
                  キーワード (カンマ区切り)
                </label>
                <input
                  id="research-keywords"
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="例: quantum computing, qubit stability"
                  className="w-full p-2 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>
              <div className="pt-4 flex justify-end">
                <button
                  onClick={handleAutoResearch}
                  disabled={loading || !keywords}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50"
                >
                  {loading ? "リサーチ実行中..." : "リサーチを実行"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="manual-title"
                  className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"
                >
                  タイトル *
                </label>
                <input
                  id="manual-title"
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="文献やWebページのタイトル"
                  className="w-full p-2 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>
              <div>
                <label
                  htmlFor="manual-url"
                  className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"
                >
                  URL *
                </label>
                <input
                  id="manual-url"
                  type="text"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full p-2 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>
              <div>
                <label
                  htmlFor="manual-snippet"
                  className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"
                >
                  概要・メモ
                </label>
                <textarea
                  id="manual-snippet"
                  value={manualSnippet}
                  onChange={(e) => setManualSnippet(e.target.value)}
                  placeholder="内容の要約やメモを入力"
                  rows={4}
                  className="w-full p-2 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 resize-y"
                />
              </div>
              <div className="pt-4 flex justify-end">
                <button
                  onClick={handleManualAdd}
                  disabled={loading || !manualTitle || !manualUrl}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium disabled:opacity-50"
                >
                  {loading ? "保存中..." : "追加"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
