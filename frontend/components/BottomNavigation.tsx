"use client";

import { List, Plus, Trash2 } from "lucide-react";

interface BottomNavigationProps {
  onOpenTreeList: () => void;
  onAddTree: () => void;
  onDeleteTree: () => void;
  hasTrees: boolean;
}

export default function BottomNavigation({
  onOpenTreeList,
  onAddTree,
  onDeleteTree,
  hasTrees,
}: BottomNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-stone-900/90 backdrop-blur border-t border-stone-200 dark:border-stone-800 lg:hidden safe-area-pb">
      <div className="flex items-center justify-between divide-x divide-stone-200 dark:divide-stone-800">
        <button
          onClick={onOpenTreeList}
          className="flex-1 flex flex-col items-center gap-1 p-3 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 active:scale-95 transition-transform"
          title="ゴール一覧"
        >
          <List className="w-7 h-7" />
        </button>

        <button
          onClick={onAddTree}
          className="flex-1 flex flex-col items-center gap-1 p-3 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 active:scale-95 transition-transform"
          title="新規ゴール作成"
        >
          <Plus className="w-7 h-7" />
        </button>

        <button
          onClick={onDeleteTree}
          disabled={!hasTrees}
          className={`flex-1 flex flex-col items-center gap-1 p-3 active:scale-95 transition-transform ${
            hasTrees
              ? "text-stone-600 dark:text-stone-400 hover:text-red-600 dark:hover:text-red-400"
              : "text-stone-300 dark:text-stone-700 cursor-not-allowed"
          }`}
          title="現在のゴールを削除"
        >
          <Trash2 className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
}
