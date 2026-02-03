"use client";

import { ArrowRight } from "lucide-react";
import type { RefinementData } from "@/types";

interface RefineProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  currentContent: string; // Used for fallback or primary label context
  suggestion: RefinementData | null;
  currentCondition?: string;
  currentCurrentState?: string;
}

export default function RefineProposalModal({
  isOpen,
  onApply,
  onClose,
  suggestion,
  currentContent,
  currentCondition,
  currentCurrentState,
}: RefineProposalModalProps) {
  if (!isOpen || !suggestion) return null;

  // Holistic View (Ideal State)
  if (suggestion.refinedIdealState !== undefined) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
        <div className="w-full max-w-5xl bg-white dark:bg-stone-900 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[90vh]">
          <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center bg-stone-50 dark:bg-stone-950/50 rounded-t-xl">
            <h2 className="font-semibold text-lg text-stone-800 dark:text-stone-100">
              要素の修正提案 (全体)
            </h2>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
            >
              ✕
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {/* Reasons - Holistic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg border border-stone-200 dark:border-stone-800">
                <div className="text-xs font-bold text-green-600 dark:text-green-500 mb-1">
                  維持すべき理由
                </div>
                <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  {suggestion.reasonToKeep}
                </p>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="text-xs font-bold text-amber-600 dark:text-amber-500 mb-1">
                  変更すべき理由
                </div>
                <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  {suggestion.reasonToChange}
                </p>
              </div>
            </div>

            {/* Comparison Table */}
            <div className="space-y-4">
              {/* Ideal State */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-1 opacity-60">
                  <div className="text-xs font-bold text-stone-400 uppercase">現状: 理想の状態</div>
                  <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded border border-stone-200 dark:border-stone-700 min-h-[3rem] text-sm">
                    {currentContent || "(未設定)"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-indigo-500 uppercase">
                    提案: 理想の状態
                  </div>
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded border border-indigo-200 dark:border-indigo-800 min-h-[3rem] text-sm font-medium text-indigo-900 dark:text-indigo-100">
                    {suggestion.refinedIdealState}
                  </div>
                </div>
              </div>

              {/* Current State */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-1 opacity-60">
                  <div className="text-xs font-bold text-stone-400 uppercase">現状: 現在の状態</div>
                  <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded border border-stone-200 dark:border-stone-700 min-h-[3rem] text-sm">
                    {currentCurrentState || "(未設定)"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-indigo-500 uppercase">
                    提案: 現在の状態
                  </div>
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded border border-indigo-200 dark:border-indigo-800 min-h-[3rem] text-sm font-medium text-indigo-900 dark:text-indigo-100">
                    {suggestion.refinedCurrentState || "(なし)"}
                  </div>
                </div>
              </div>

              {/* Condition */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-1 opacity-60">
                  <div className="text-xs font-bold text-stone-400 uppercase">現状: 条件</div>
                  <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded border border-stone-200 dark:border-stone-700 min-h-[3rem] text-sm">
                    {currentCondition || "(未設定)"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-indigo-500 uppercase">提案: 条件</div>
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded border border-indigo-200 dark:border-indigo-800 min-h-[3rem] text-sm font-medium text-indigo-900 dark:text-indigo-100">
                    {suggestion.refinedCondition || "(なし)"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/50 rounded-b-xl flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800 rounded transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={onApply}
              className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-lg shadow-indigo-500/30 transition-all transform active:scale-95"
            >
              すべて適用
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Legacy (Suggestions List)
  if (!suggestion.suggestions) return null;

  const fieldLabels: Record<string, string> = {
    content: "内容",
    condition: "条件",
    currentState: "現在の状態",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
      <div className="w-full max-w-5xl bg-white dark:bg-stone-900 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center bg-stone-50 dark:bg-stone-950/50 rounded-t-xl">
          <h2 className="font-semibold text-lg text-stone-800 dark:text-stone-100">
            要素の修正提案
          </h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          {suggestion.suggestions.map((item) => (
            <div key={item.field} className="space-y-2">
              <div className="text-sm font-bold text-stone-500 uppercase tracking-widest border-b border-stone-200 dark:border-stone-800 pb-1 mb-3">
                {fieldLabels[item.field] || item.field}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start relative">
                {/* Arrow (Desktop) */}
                <div className="hidden md:flex absolute left-1/2 top-10 -translate-x-1/2 z-10 items-center justify-center w-6 h-6 bg-stone-200 dark:bg-stone-700 rounded-full text-stone-500 dark:text-stone-300">
                  <ArrowRight className="w-3 h-3" />
                </div>

                {/* Keep Reason / Context */}
                <div className="flex flex-col gap-3 p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg border border-stone-200 dark:border-stone-800 h-full">
                  <div className="text-xs font-bold text-green-600 dark:text-green-500 mb-1">
                    維持すべき理由
                  </div>
                  <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                    {item.keepReason}
                  </p>
                </div>

                {/* Proposed Value & Change Reason */}
                <div className="flex flex-col gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg border border-indigo-200 dark:border-indigo-800 h-full shadow-sm">
                  <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest">
                    提案内容
                  </div>
                  <div className="text-lg font-medium text-indigo-900 dark:text-indigo-100 leading-relaxed">
                    {item.value}
                  </div>
                  <div className="mt-4 pt-3 border-t border-indigo-100 dark:border-indigo-800/30">
                    <div className="text-xs font-bold text-amber-600 dark:text-amber-500 mb-1">
                      変更すべき理由
                    </div>
                    <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                      {item.changeReason}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/50 rounded-b-xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800 rounded transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={onApply}
            className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-lg shadow-indigo-500/30 transition-all transform active:scale-95"
          >
            すべて適用
          </button>
        </div>
      </div>
    </div>
  );
}
