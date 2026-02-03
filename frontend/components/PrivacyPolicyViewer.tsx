"use client";

import { Card, CardBody } from "@heroui/react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { PrivacyContent } from "@/data/privacyContent";

function SimpleCompassLogo() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className="text-stone-800 dark:text-stone-200"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 5L15 14H9L12 5Z" fill="currentColor" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}

export default function PrivacyPolicyViewer({
  content,
  lang,
}: {
  content: PrivacyContent;
  lang: string;
}) {
  const sections = [
    { body: content.collection_body, title: content.collection_title },
    { body: content.analytics_body, title: content.analytics_title },
    { body: content.usage_body, title: content.usage_title },
    { body: content.third_party_body, title: content.third_party_title },
    { body: content.contact_body, title: content.contact_title },
  ];

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center p-4 md:p-8">
      <div className="w-full max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">{content.backToHome}</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex gap-2 text-sm font-medium">
              <a
                href="/privacy-policy/en/"
                className={`px-2 py-1 rounded transition-colors ${lang === "en" ? "bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100" : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"}`}
              >
                English
              </a>
              <a
                href="/privacy-policy/ja/"
                className={`px-2 py-1 rounded transition-colors ${lang === "ja" ? "bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100" : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"}`}
              >
                日本語
              </a>
            </div>

            <div className="flex items-center gap-2 opacity-50">
              <SimpleCompassLogo />
              <span className="font-semibold text-stone-700 dark:text-stone-300">North</span>
            </div>
          </div>
        </div>

        <Card className="shadow-lg border border-stone-200 dark:border-stone-800">
          <CardBody className="p-8 md:p-12 prose dark:prose-invert max-w-none">
            <h1 className="text-3xl font-bold mb-2 text-stone-900 dark:text-stone-100">
              {content.title}
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-8 border-b border-stone-200 dark:border-stone-700 pb-4">
              {content.lastUpdated}
            </p>

            <p className="mb-8 leading-relaxed whitespace-pre-wrap">{content.introduction}</p>

            <div className="space-y-8">
              {sections.map((section) => (
                <section key={section.title}>
                  <h2 className="text-xl font-bold mb-3 text-stone-800 dark:text-stone-200">
                    {section.title}
                  </h2>
                  <p className="text-stone-600 dark:text-stone-300 leading-relaxed whitespace-pre-wrap">
                    {section.body}
                  </p>
                </section>
              ))}
            </div>
          </CardBody>
        </Card>

        <footer className="mt-8 text-center text-xs text-stone-400">
          &copy; 2026 North. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
