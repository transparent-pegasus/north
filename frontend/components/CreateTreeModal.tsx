"use client";

import { useState } from "react";

import { apiFetch } from "@/lib/api";

interface CreateTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateTreeModal({ isOpen, onClose, onCreated }: CreateTreeModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await apiFetch("/api/trees", {
        body: JSON.stringify({ name: name.trim() }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      setName("");
      onCreated();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) handleCreate();
    if (e.key === "Escape") onClose();
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800 shadow-2xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4">
          新しいゴールを作成
        </h2>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="ゴール名を入力..."
          className="w-full px-3 py-2 text-sm rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-1 focus:ring-stone-400 focus:border-stone-400 outline-none transition-all text-stone-800 dark:text-stone-100 mb-4"
        />

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
          >
            キャンセル
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="px-4 py-2 text-sm font-medium bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 rounded hover:bg-stone-700 dark:hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "..." : "作成"}
          </button>
        </div>
      </div>
    </div>
  );
}
