"use client";

import { useEffect, useState } from "react";

import { useModal } from "@/components/ModalProvider";
import { apiFetch } from "@/lib/api";
import { AVAILABLE_SOURCES, type ResearchSpec, type SourceType } from "@/types";

interface ResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSpec?: ResearchSpec | null;
  nodeId: string;
  onResearchComplete: () => void;
  setGlobalLoading: (loading: boolean | string) => void;
}

export default function ResearchModal({
  initialSpec,
  isOpen,
  nodeId,
  onClose,
  onResearchComplete,
  setGlobalLoading,
}: ResearchModalProps) {
  const { showError } = useModal();
  const [source, setSource] = useState<SourceType>("openalex");
  const [keywords, setKeywords] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialSpec) {
        setSource(initialSpec.source);
        setKeywords(initialSpec.keywords.join(", "));
      } else {
        setSource("openalex");
        setKeywords("");
      }
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

        <div className="p-6 overflow-y-auto flex-1">
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
                {loading ? "リサーチ実行中..." : "リサーチを実行 (文献自動リンク)"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
