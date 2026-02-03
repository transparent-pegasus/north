"use client";

import { Button, Divider, Input } from "@heroui/react";
import { useEffect, useState } from "react";

interface ResearchPanelProps {
  setGlobalLoading: (loading: boolean) => void;
}

export default function ResearchPanel({ setGlobalLoading }: ResearchPanelProps) {
  const [sources, setSources] = useState<{ name: string; path: string }[]>([]);
  const [query, setQuery] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/sources")
      .then((res) => res.json())
      .then(setSources)
      .catch(console.error);
  }, []); // Refresh after research

  const handleResearch = async () => {
    if (!query) return;
    setLoading(true);
    setGlobalLoading(true);
    try {
      await fetch("/api/research", {
        body: JSON.stringify({ goal, query }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
    } catch (e) {
      console.error(e);
      alert("Research failed");
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  };

  return (
    <div className="p-5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 shadow-sm flex flex-col gap-4 mt-4">
      <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
        <div className="font-bold text-lg text-gray-900 dark:text-white">Research Module</div>
      </div>

      <div className="flex flex-col gap-3">
        <Input
          label="Research Context"
          labelPlacement="outside"
          placeholder="e.g. Goal context"
          value={goal}
          onValueChange={setGoal}
          size="sm"
          classNames={{
            input: "text-gray-900 dark:text-white",
            label: "text-gray-700 dark:text-gray-300 font-medium",
          }}
        />
        <Input
          label="Search Query"
          labelPlacement="outside"
          placeholder="Enter keywords"
          value={query}
          onValueChange={setQuery}
          size="sm"
          classNames={{
            input: "text-gray-900 dark:text-white",
            label: "text-gray-700 dark:text-gray-300 font-medium",
          }}
        />
        <Button
          onPress={handleResearch}
          isLoading={loading}
          className="w-full font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-500/30 mt-2"
          size="lg"
          radius="md"
        >
          <div className="flex items-center gap-3 px-2 justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-search"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            Conduct Research
          </div>
        </Button>
      </div>

      <Divider className="my-1" />

      <div className="flex flex-col gap-2">
        <div className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          Sources
        </div>
        <div className="max-h-48 overflow-y-auto flex flex-col gap-2 pr-1">
          {sources.length === 0 && (
            <span className="text-sm text-gray-400 italic p-1">No sources found yet.</span>
          )}
          {sources.map((s) => (
            <div
              key={s.name}
              className="text-sm truncate p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={s.name}
            >
              📄 {s.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
