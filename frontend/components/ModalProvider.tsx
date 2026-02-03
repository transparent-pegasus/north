"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

interface ModalState {
  type: "confirm" | "prompt" | "idealState" | "alert" | null;
  title?: string;
  message?: string;
  placeholder?: string;
  onConfirm: (value?: any) => void;
  onCancel: () => void;
}

interface ModalContextType {
  showConfirm: (message: string) => Promise<boolean>;
  showPrompt: (message: string, placeholder?: string) => Promise<string | null>;
  showError: (message: string) => Promise<void>;
  showIdealStatePrompt: () => Promise<{
    condition: string;
    content: string;
    currentState: string;
  } | null>;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function useModal() {
  const context = useContext(ModalContext);

  if (!context) throw new Error("useModal must be used within ModalProvider");

  return context;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalState | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [idealStateData, setIdealStateData] = useState({
    condition: "",
    content: "",
    currentState: "",
  });

  const showConfirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setModal({
        message, // Body
        onCancel: () => {
          setModal(null);
          resolve(false);
        },
        onConfirm: () => {
          setModal(null);
          resolve(true);
        },
        title: "確認", // Header
        type: "confirm",
      });
    });
  }, []);

  const showError = useCallback((message: string): Promise<void> => {
    return new Promise((resolve) => {
      setModal({
        message, // Body
        onCancel: () => {
          setModal(null);
          resolve();
        },
        onConfirm: () => {
          setModal(null);
          resolve();
        },
        title: "エラー", // Header
        type: "alert",
      });
    });
  }, []);

  const showPrompt = useCallback(
    (message: string, placeholder?: string): Promise<string | null> => {
      return new Promise((resolve) => {
        setInputValue("");
        setModal({
          onCancel: () => {
            setModal(null);
            resolve(null);
          },
          onConfirm: (value) => {
            setModal(null);
            resolve(value || null);
          },
          placeholder,
          title: message, // Prompt message acts as title
          type: "prompt",
        });
      });
    },
    [],
  );

  const showIdealStatePrompt = useCallback((): Promise<{
    condition: string;
    content: string;
    currentState: string;
  } | null> => {
    return new Promise((resolve) => {
      setIdealStateData({ condition: "", content: "", currentState: "" });
      setModal({
        onCancel: () => {
          setModal(null);
          resolve(null);
        },
        onConfirm: (data) => {
          setModal(null);
          resolve(data);
        },
        title: "理想の状態を追加",
        type: "idealState",
      });
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modal) {
        modal.onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modal]);

  const handleConfirm = () => {
    if (!modal) return;
    if (modal.type === "idealState") {
      if (!idealStateData.content || !idealStateData.condition || !idealStateData.currentState) {
        return;
      }
      modal.onConfirm(idealStateData);
    } else {
      modal.onConfirm(inputValue);
    }
  };

  return (
    <ModalContext.Provider value={{ showConfirm, showError, showIdealStatePrompt, showPrompt }}>
      {children}

      {modal && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800 shadow-2xl w-full max-w-sm mx-4 p-5">
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-4">
              {modal.title}
            </h3>

            {modal.type === "prompt" && (
              <div className="mb-4">
                <label className="sr-only" htmlFor="modal-prompt-input">
                  {modal.title}
                </label>
                <input
                  className="w-full px-3 py-2 text-sm rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-1 focus:ring-stone-400 outline-none text-stone-800 dark:text-stone-100"
                  id="modal-prompt-input"
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                  placeholder={modal.placeholder}
                  type="text"
                  value={inputValue}
                />
              </div>
            )}

            {modal.type === "idealState" && (
              <div className="space-y-4 mb-5">
                <div>
                  <label
                    className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1"
                    htmlFor="modal-ideal-content"
                  >
                    理想の状態
                  </label>
                  <input
                    className="w-full px-3 py-2 text-sm rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-1 focus:ring-stone-400 outline-none text-stone-800 dark:text-stone-100"
                    id="modal-ideal-content"
                    onChange={(e) =>
                      setIdealStateData((prev) => ({
                        ...prev,
                        content: e.target.value,
                      }))
                    }
                    placeholder="例: 副収入で月5万円稼いでいる"
                    type="text"
                    value={idealStateData.content}
                  />
                </div>
                <div>
                  <label
                    className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1"
                    htmlFor="modal-ideal-current"
                  >
                    現在の状態
                  </label>
                  <input
                    className="w-full px-3 py-2 text-sm rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-1 focus:ring-stone-400 outline-none text-stone-800 dark:text-stone-100"
                    id="modal-ideal-current"
                    onChange={(e) =>
                      setIdealStateData((prev) => ({
                        ...prev,
                        currentState: e.target.value,
                      }))
                    }
                    placeholder="例: 本業以外に収入がない"
                    type="text"
                    value={idealStateData.currentState}
                  />
                </div>
                <div>
                  <label
                    className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1"
                    htmlFor="modal-ideal-condition"
                  >
                    条件
                  </label>
                  <input
                    className="w-full px-3 py-2 text-sm rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-1 focus:ring-stone-400 outline-none text-stone-800 dark:text-stone-100"
                    id="modal-ideal-condition"
                    onChange={(e) =>
                      setIdealStateData((prev) => ({
                        ...prev,
                        condition: e.target.value,
                      }))
                    }
                    placeholder="例: 現在の状態から理想の状態へ移行するための条件"
                    type="text"
                    value={idealStateData.condition}
                  />
                </div>
              </div>
            )}

            {(modal.type === "confirm" || modal.type === "alert") && (
              <p className="text-sm text-stone-700 dark:text-stone-200 mb-4">{modal.message}</p>
            )}

            <div className="flex gap-2 justify-end">
              {modal.type !== "alert" && (
                <button
                  onClick={modal.onCancel}
                  className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
                >
                  キャンセル
                </button>
              )}
              <button
                onClick={handleConfirm}
                disabled={
                  modal.type === "idealState" &&
                  (!idealStateData.content ||
                    !idealStateData.condition ||
                    !idealStateData.currentState)
                }
                className="px-4 py-2 text-sm font-medium bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 rounded hover:bg-stone-700 dark:hover:bg-stone-200 disabled:opacity-40"
              >
                {modal.type === "confirm" ? "OK" : modal.type === "alert" ? "閉じる" : "追加"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}
