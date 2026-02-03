import { notFound } from "next/navigation";

import PrivacyPolicyViewer from "@/components/PrivacyPolicyViewer";
import { privacyContent } from "@/data/privacyContent";

export async function generateStaticParams() {
  return [{ lang: "ja" }, { lang: "en" }];
}

export const metadata = {
  title: "Privacy Policy - North",
};

export default async function PrivacyLangPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  if (lang !== "ja" && lang !== "en") {
    notFound();
  }

  const content = privacyContent[lang as keyof typeof privacyContent];

  if (!content) {
    notFound();
  }

  return <PrivacyPolicyViewer content={content} lang={lang} />;
}
