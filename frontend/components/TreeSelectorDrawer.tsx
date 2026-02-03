"use client";

import { Check } from "lucide-react";
import { useEffect } from "react";

interface TreeSelectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  trees: { id: string; name: string }[];
  activeTreeId?: string;
  onSelect: (id: string) => void;
}

export default function TreeSelectorDrawer({
  isOpen,
  onClose,
  trees,
  activeTreeId,
  onSelect,
}: TreeSelectorDrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm pointer-events-auto transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Content */}
      <div className="relative w-full bg-stone-50 dark:bg-stone-900 rounded-t-2xl shadow-2xl overflow-hidden pointer-events-auto animate-in slide-in-from-bottom duration-300 max-h-[70vh] flex flex-col">
        <div className="flex justify-center pt-4 pb-2 flex-shrink-0">
          {/* Handle bar */}
          <div className="w-12 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full" />
        </div>

        <div className="px-4 pb-2 border-b border-stone-200 dark:border-stone-800 flex-shrink-0">
          <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest text-center">
            ゴールを選択
          </h3>
        </div>

        <div className="p-2 overflow-y-auto">
          {trees.map((tree) => (
            <button
              key={tree.id}
              onClick={() => {
                onSelect(tree.id);
                onClose();
              }}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-colors ${
                tree.id === activeTreeId
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
              }`}
            >
              <span className="font-medium truncate">{tree.name}</span>
              {tree.id === activeTreeId && <Check className="w-4 h-4" />}
            </button>
          ))}

          {trees.length === 0 && (
            <div className="p-4 text-center text-stone-400 text-sm">ゴールが見つかりません。</div>
          )}
        </div>
      </div>
    </div>
  );
}
