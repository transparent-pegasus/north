import PrivacyPolicyViewer from "@/components/PrivacyPolicyViewer";
import { privacyContent } from "@/data/privacyContent";

export const metadata = {
  title: "Privacy Policy - North",
};

export default function PrivacyPage() {
  return <PrivacyPolicyViewer content={privacyContent.en} lang="en" />;
}
