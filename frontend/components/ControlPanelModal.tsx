"use client";

import { useEffect } from "react";

interface ControlPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function ControlPanelModal({ children, isOpen, onClose }: ControlPanelModalProps) {
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
    <div className="fixed inset-0 z-40 lg:hidden flex flex-col justify-end pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      />

      {/* Drawer Content */}
      <div className="relative w-full bg-stone-50 dark:bg-stone-900 rounded-t-2xl shadow-2xl p-4 max-h-[75vh] overflow-y-auto pointer-events-auto animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-center mb-4">
          {/* Handle bar */}
          <div className="w-12 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full" />
        </div>

        {children}
      </div>
    </div>
  );
}
