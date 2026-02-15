"use client";

import { Hand, Lock, LogOut, Menu, Plus, Shield, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import BottomNavigation from "@/components/BottomNavigation";
import ControlPanel from "@/components/ControlPanel";
import ControlPanelModal from "@/components/ControlPanelModal";
import CreateTreeModal from "@/components/CreateTreeModal";
import { useModal } from "@/components/ModalProvider";
import TitleScreen from "@/components/TitleScreen";
import TreeList from "@/components/TreeList";
import TreeSelectorDrawer from "@/components/TreeSelectorDrawer";
import { apiFetch } from "@/lib/api";
import { config } from "@/lib/config";
import type { Tree, TreeIndex } from "@/types";

// Minimal compass logo - simple geometric north arrow
function CompassLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`text-stone-800 dark:text-stone-200 ${className || "w-5 h-5"}`}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 5L15 14H9L12 5Z" fill="currentColor" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}

import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/lib/firebase";

export default function Home() {
  // Auth State
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App State
  const { showConfirm } = useModal();
  const [selectedNode, setSelectedNode] = useState<{
    condition?: string;
    currentState?: string;
    id: string;
    label?: string;
    researchSpec?: any;
    type: "goal" | "ideal";
  } | null>(null);
  const [version, setVersion] = useState(0);
  const [globalLoadingMessage, setGlobalLoadingMessage] = useState<string | null>(null);
  const [treeIndex, setTreeIndex] = useState<TreeIndex | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [isTreeDrawerOpen, setIsTreeDrawerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [processingNodes, setProcessingNodes] = useState<Set<string>>(new Set());

  // Tree Detail State
  const [tree, setTree] = useState<Tree | null>(null);
  const [isTreeLoading, setIsTreeLoading] = useState(false);

  const isGlobalLoading = !!globalLoadingMessage;
  const setGlobalLoading = (loading: boolean | string) => {
    if (typeof loading === "string") {
      setGlobalLoadingMessage(loading);
    } else if (loading) {
      setGlobalLoadingMessage("Processing"); // Default
    } else {
      setGlobalLoadingMessage(null);
    }
  };

  const handleAddProcessingNode = (id: string) => {
    setProcessingNodes((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleRemoveProcessingNode = (id: string) => {
    setProcessingNodes((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      apiFetch("/api/trees")
        .then((res) => {
          if (res.status === 401) {
            console.warn("Unauthorized, forcing logout");
            auth.signOut();

            return null;
          }
          if (!res.ok) throw new Error(res.statusText);

          return res.json();
        })
        .then((data) => {
          if (data) setTreeIndex(data);
        })
        .catch(console.error);
    }
  }, [user]);

  // Fetch Active Tree
  useEffect(() => {
    const treeId = treeIndex?.activeTreeId;
    if (!user || !treeId) {
      setTree(null);
      return;
    }

    setIsTreeLoading(true);
    apiFetch(`/api/trees/${treeId}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(setTree)
      .catch(console.error)
      .finally(() => setIsTreeLoading(false));

    // Explicitly use version to trigger refetch
    void version;
  }, [user, treeIndex?.activeTreeId, version]);

  // Sync selectedNode with updated tree
  // ツリーデータの形状と selectedNode の形状は異なるため、
  // 必要なプロパティだけを明示的に構築して同期する
  useEffect(() => {
    if (!tree || !selectedNode) return;

    // Helper to find ideal state node
    const findIdeal = (id: string) => tree.goal.idealStates.find((i) => i.id === id);

    if (tree.goal.id === selectedNode.id) {
      const newNode = {
        id: tree.goal.id,
        type: "goal" as const,
        label: tree.goal.content,
        content: tree.goal.content,
        childCount: tree.goal.idealStates.length,
        pendingProposal: tree.goal.pendingProposal,
      };

      if (JSON.stringify(newNode) !== JSON.stringify(selectedNode)) {
        setSelectedNode(newNode);
      }
      return;
    }

    const found = findIdeal(selectedNode.id);
    if (found) {
      const newNode = {
        id: found.id,
        type: "ideal" as const,
        label: found.content,
        content: found.content,
        condition: found.condition?.content,
        currentState: found.currentState?.content,
        researchSpec: found.researchSpec,
        pendingProposal: found.pendingProposal,
      };

      if (JSON.stringify(newNode) !== JSON.stringify(selectedNode)) {
        setSelectedNode(newNode);
      }
    }
  }, [tree, selectedNode]);

  const refreshTree = (keepSelection = false) => {
    setVersion((v) => v + 1);
    if (!keepSelection) {
      setSelectedNode(null);
      setIsMobilePanelOpen(false); // Close panel on refresh if new selection or done
    }
  };

  const handleUpdateTree = (newTree: Tree | null) => {
    setTree(newTree);
  };

  const handleSelectNode = (node: any) => {
    setSelectedNode(node);
    if (node && window.innerWidth < 1024) {
      // Mobile check
      setIsMobilePanelOpen(true);
    }
  };

  const isTreeIndexLoading = !treeIndex;
  const treeCount = treeIndex?.trees?.length || 0;
  const maxTrees = config.limits.maxTrees;
  const isLimitReached = treeCount >= maxTrees;
  const isCreationDisabled = isTreeIndexLoading || isLimitReached;

  const handleDeleteTree = async () => {
    if (!treeIndex?.activeTreeId) return;
    const ok = await showConfirm("このゴールを削除しますか？");

    if (!ok) return;

    const deletedId = treeIndex.activeTreeId;

    // Optimistic Update: Remove tree from list immediately
    const remainingTrees = treeIndex.trees.filter((t) => t.id !== deletedId);
    const newActiveId = remainingTrees[0]?.id || "";
    setTreeIndex({
      ...treeIndex,
      trees: remainingTrees,
      activeTreeId: newActiveId,
    });

    // Background delete
    await apiFetch(`/api/trees/${deletedId}`, {
      method: "DELETE",
    });

    // Refresh to sync with server
    refreshTree();
  };

  const fetchTreeIndex = async () => {
    try {
      const res = await apiFetch("/api/trees");
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  const handleSelectTree = async (id: string, indexData?: TreeIndex) => {
    // Optimistic Update: Use provided indexData if available (fresh), otherwise current state
    const baseIndex = indexData || treeIndex;
    if (baseIndex) {
      setTreeIndex({ ...baseIndex, activeTreeId: id });
    }
    // Background update
    await apiFetch(`/api/trees/${id}/active`, { method: "PUT" });
    refreshTree();
  };

  const handleTreePromoted = async (id: string) => {
    const newData = await fetchTreeIndex();
    if (newData) {
      await handleSelectTree(id, newData);
    } else {
      // Fallback
      await handleSelectTree(id);
    }
  };

  const handleTreeCreated = (newTree: Tree) => {
    if (!treeIndex) return;

    setTreeIndex({
      trees: [
        ...treeIndex.trees,
        { id: newTree.id, name: newTree.name, updatedAt: newTree.updatedAt },
      ],
      activeTreeId: newTree.id,
    });
    refreshTree();
  };

  if (authLoading) {
    return (
      <div className="h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <TitleScreen />;
  }

  return (
    <div className="h-screen bg-stone-50 dark:bg-stone-950 flex flex-col">
      {/* ... (Loading Overlay omitted for brevity in diff, but preserved in file logic) ... */}
      {/* Loading Overlay */}
      {isGlobalLoading && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-4 p-8 bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 max-w-xs text-center relative pointer-events-auto">
            {/* ... */}
            {globalLoadingMessage?.includes("Decomposing") && (
              <button
                onClick={() => setGlobalLoading(false)}
                className="absolute top-2 right-2 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                title="閉じる (バックグラウンドで続行)"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}

            <div className="w-10 h-10 border-3 border-stone-400 border-t-transparent rounded-full animate-spin"></div>
            <div className="space-y-3 mt-2">
              <p className="text-xs font-bold text-stone-700 dark:text-stone-300 tracking-widest uppercase">
                {globalLoadingMessage}
              </p>
              {globalLoadingMessage?.includes("Decomposing") && (
                <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-relaxed">
                  AIがツリーを分解しています。これには数分かかる場合があります。
                  <br />
                  <span className="font-semibold text-amber-600 dark:text-amber-500">
                    右上のボタンで閉じて、他の作業を続けられます。
                  </span>
                </p>
              )}
              {globalLoadingMessage?.includes("Refining") && (
                <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-relaxed">
                  AIが修正案を作成しています。これにはしばらく時間がかかります。
                  <br />
                  この画面を離れても、後ほどノードを選択して結果を確認できます。
                </p>
              )}
              {globalLoadingMessage?.includes("Researching") && (
                <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-relaxed">
                  情報を調査し、要約を作成しています。
                  <br />
                  これにはしばらく時間がかかります。
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Tree Modal */}
      <CreateTreeModal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleTreeCreated}
      />

      {/* Tree Selector Drawer (Mobile) */}
      <TreeSelectorDrawer
        isOpen={isTreeDrawerOpen}
        onClose={() => setIsTreeDrawerOpen(false)}
        trees={treeIndex?.trees || []}
        activeTreeId={treeIndex?.activeTreeId}
        onSelect={handleSelectTree}
      />

      {/* Header */}
      <header className="px-4 py-2 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center gap-4">
        {/* ... Header content ... */}
        <div className="flex items-center gap-2">
          <CompassLogo className="w-6 h-6" />
          <span className="text-lg font-bold tracking-tight text-stone-800 dark:text-stone-100">
            North
          </span>
        </div>

        {/* Tree Selector - Desktop */}
        <div className="hidden lg:flex flex-1 items-center gap-2">
          {treeIndex && Array.isArray(treeIndex.trees) && treeIndex.trees.length > 0 && (
            <select
              value={treeIndex.activeTreeId || ""}
              onChange={(e) => handleSelectTree(e.target.value)}
              className="px-2 py-1 text-sm rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-100 max-w-[200px] truncate"
            >
              {treeIndex.trees.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => !isCreationDisabled && setCreateModalOpen(true)}
            disabled={isCreationDisabled}
            className={`p-1.5 rounded transition-colors ${
              isCreationDisabled
                ? "text-stone-300 dark:text-stone-600 bg-stone-100 dark:bg-stone-800/50 cursor-not-allowed"
                : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
            title={
              isTreeIndexLoading
                ? "読み込み中..."
                : isLimitReached
                  ? `作成上限に達しました (${treeCount}/${maxTrees})`
                  : `新規作成 (${treeCount}/${maxTrees})`
            }
          >
            {isLimitReached ? <Lock className="w-4 h-4" /> : <Plus className="w-5 h-5" />}
          </button>

          {treeIndex && Array.isArray(treeIndex.trees) && treeIndex.trees.length > 0 && (
            <button
              onClick={handleDeleteTree}
              className="p-1.5 text-stone-400 hover:text-red-500 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="削除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="lg:hidden flex-1" />

        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded transition-colors"
          >
            <span>メニュー</span>
            <Menu className="w-4 h-4" />
          </button>
          {/* ... Menu items ... */}
          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
              <div className="absolute right-0 top-full mt-2 w-56 z-50 bg-white dark:bg-stone-900 rounded-lg shadow-xl border border-stone-200 dark:border-stone-800 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <ul className="py-1">
                  <li>
                    <a
                      href="/privacy-policy/ja/"
                      className="flex items-center gap-3 px-4 py-3 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Shield className="w-4 h-4 text-stone-400" />
                      プライバシーポリシー
                    </a>
                  </li>
                  <li className="border-t border-stone-100 dark:border-stone-800">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        auth.signOut();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      ログアウト
                    </button>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col lg:flex-row gap-3 p-3 min-h-0 overflow-auto lg:pb-3 pb-[calc(32px+env(safe-area-inset-bottom,0px))] ${
          isGlobalLoading && !globalLoadingMessage?.includes("Decomposing")
            ? "pointer-events-none opacity-50"
            : ""
        }`}
      >
        {!selectedNode && (
          <div className="lg:hidden fixed bottom-[calc(60px+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-20 flex items-center justify-center gap-2 py-2 px-6 bg-white/90 dark:bg-stone-900/90 backdrop-blur shadow-lg border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full text-sm animate-pulse whitespace-nowrap">
            <Hand className="w-4 h-4" />
            <span className="font-medium">ノードをタップして操作</span>
          </div>
        )}

        {/* Tree View */}
        <div className="flex-1 bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800 overflow-hidden min-h-[300px] lg:min-h-0">
          <TreeList
            onNodeSelect={handleSelectNode}
            onRefresh={refreshTree}
            processingNodes={processingNodes}
            tree={tree}
            onUpdateTree={handleUpdateTree}
            isLoading={isTreeLoading || isTreeIndexLoading}
            onAddTree={() => !isCreationDisabled && setCreateModalOpen(true)}
            isLimitReached={isLimitReached}
            selectedNodeId={selectedNode?.id}
          />
        </div>

        {/* ControlPanel - Desktop */}
        <div className="hidden lg:block w-80 flex-shrink-0 overflow-y-auto h-full">
          <ControlPanel
            selectedNode={selectedNode}
            onDecompose={refreshTree}
            tree={tree}
            onUpdateTree={handleUpdateTree}
            setGlobalLoading={setGlobalLoading}
            onProcessingStart={handleAddProcessingNode}
            onProcessingEnd={handleRemoveProcessingNode}
            version={version}
            onSwitchTree={handleTreePromoted}
            processingNodes={processingNodes}
          />
        </div>

        {/* Mobile Modal */}
        <ControlPanelModal isOpen={isMobilePanelOpen} onClose={() => setIsMobilePanelOpen(false)}>
          <ControlPanel
            selectedNode={selectedNode}
            onDecompose={refreshTree}
            tree={tree}
            onUpdateTree={handleUpdateTree}
            setGlobalLoading={setGlobalLoading}
            onProcessingStart={handleAddProcessingNode}
            onProcessingEnd={handleRemoveProcessingNode}
            onClose={() => setIsMobilePanelOpen(false)}
            version={version}
            onSwitchTree={handleTreePromoted}
            processingNodes={processingNodes}
          />
        </ControlPanelModal>
      </div>

      {/* Bottom Navigation (Mobile) */}
      <BottomNavigation
        onOpenTreeList={() => setIsTreeDrawerOpen(true)}
        onAddTree={() => setCreateModalOpen(true)}
        onDeleteTree={handleDeleteTree}
        hasTrees={!!(treeIndex && Array.isArray(treeIndex.trees) && treeIndex.trees.length > 0)}
        isLimitReached={isCreationDisabled}
      />
    </div>
  );
}
