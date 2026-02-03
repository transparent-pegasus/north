"use client";

import { ArrowRight } from "lucide-react";

interface RefinementSuggestion {
  keepReason: string;
  changeReason: string;
  newContent: string;
}

interface RefineProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  currentContent: string;
  suggestion: RefinementSuggestion | null;
}

export default function RefineProposalModal({
  currentContent,
  isOpen,
  onApply,
  onClose,
  suggestion,
}: RefineProposalModalProps) {
  if (!isOpen || !suggestion) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-white dark:bg-stone-900 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[90vh]">
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

        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start relative">
            {/* Arrow (Desktop) */}
            <div className="hidden md:flex absolute left-1/2 top-20 -translate-x-1/2 z-10 items-center justify-center w-8 h-8 bg-stone-200 dark:bg-stone-700 rounded-full text-stone-500 dark:text-stone-300">
              <ArrowRight className="w-4 h-4" />
            </div>

            {/* Current */}
            <div className="flex flex-col gap-3 p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg border border-stone-200 dark:border-stone-800 h-full">
              <div className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                現在の内容
              </div>
              <div className="text-lg font-medium text-stone-700 dark:text-stone-300 leading-relaxed">
                {currentContent}
              </div>
              <div className="mt-4 p-3 bg-white dark:bg-stone-900 rounded border border-stone-100 dark:border-stone-700/50">
                <div className="text-xs font-bold text-green-600 dark:text-green-500 mb-1">
                  維持すべき点 (Keep Reason)
                </div>
                <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  {suggestion.keepReason}
                </p>
              </div>
            </div>

            {/* Arrow (Mobile) */}
            <div className="md:hidden flex justify-center py-2">
              <div className="flex items-center justify-center w-8 h-8 bg-stone-200 dark:bg-stone-700 rounded-full text-stone-500 dark:text-stone-300">
                <ArrowRight className="w-4 h-4 rotate-90" />
              </div>
            </div>

            {/* Proposed */}
            <div className="flex flex-col gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg border border-indigo-200 dark:border-indigo-800 h-full shadow-sm">
              <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest">
                提案内容
              </div>
              <div className="text-lg font-medium text-indigo-900 dark:text-indigo-100 leading-relaxed">
                {suggestion.newContent}
              </div>
              <div className="mt-4 p-3 bg-white dark:bg-stone-900 rounded border border-indigo-100 dark:border-indigo-800/30">
                <div className="text-xs font-bold text-amber-600 dark:text-amber-500 mb-1">
                  変更の理由 (Change Reason)
                </div>
                <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  {suggestion.changeReason}
                </p>
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
            適用して変更
          </button>
        </div>
      </div>
    </div>
  );
}
