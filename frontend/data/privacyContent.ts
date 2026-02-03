export const privacyContent = {
  en: {
    analytics_body:
      "The Service uses 'Google Analytics', an access analysis tool by Google. Google Analytics uses Cookies to collect traffic data. This traffic data is collected anonymously and does not identify individuals. You can refuse this collection by disabling Cookies; please check your browser settings.",
    analytics_title: "Article 2 (Use of Google Analytics)",
    backToHome: "Back to Home",

    collection_body:
      "The Service may collect the following information:\n- Google Account Information (Email, UID): For authentication and data storage.\n- Usage Logs: To improve the service and prevent unauthorized use.",
    collection_title: "Article 1 (Information Collected)",

    contact_body:
      "For inquiries regarding this Policy, please contact us via the feedback function within the Service or contact the operator.",
    contact_title: "Article 5 (Contact Us)",

    introduction:
      "North (hereinafter referred to as 'Service') establishes this Privacy Policy (hereinafter referred to as 'Policy') regarding the handling of users' personal information.",
    lastUpdated: "Last Updated: February 3, 2026",

    third_party_body:
      "The Service will not provide personal information to third parties without prior user consent, except as required by law.",
    third_party_title: "Article 4 (Provision to Third Parties)",

    title: "Privacy Policy",
    usage_body:
      "The collected information is used for the following purposes:\n- To provide and operate the Service\n- To respond to user inquiries\n- To address violations of the Terms of Service",
    usage_title: "Article 3 (Purpose of Use)",
  },
  ja: {
    analytics_body:
      "当サービスでは、Googleによるアクセス解析ツール「Google Analytics」を利用しています。このGoogle Analyticsはトラフィックデータの収集のためにCookieを使用しています。このトラフィックデータは匿名で収集されており、個人を特定するものではありません。この機能はCookieを無効にすることで収集を拒否することが出来ますので、お使いのブラウザの設定をご確認ください。",
    analytics_title: "第2条（Google Analyticsの利用）",
    backToHome: "ホームに戻る",

    collection_body:
      "当サービスは、以下の情報を収集する場合があります。\n- Googleアカウント情報（メールアドレス、UID）: 認証およびデータ保存のため。\n- 利用ログ: サービスの改善および不正利用防止のため。",
    collection_title: "第1条（収集する情報）",

    contact_body:
      "本ポリシーに関するお問い合わせは、サービス内のフィードバック機能または運営者までご連絡ください。",
    contact_title: "第5条（お問い合わせ）",

    introduction:
      "North（以下、「当サービス」といいます）は、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下、「本ポリシー」といいます）を定めます。",
    lastUpdated: "最終更新日: 2026年2月3日",

    third_party_body:
      "当サービスは、法令に基づく場合を除き、あらかじめユーザーの同意を得ることなく、第三者に個人情報を提供することはありません。",
    third_party_title: "第4条（第三者への提供）",

    title: "プライバシーポリシー",
    usage_body:
      "収集した情報は、以下の目的で利用します。\n- サービスの提供・運営のため\n- ユーザーからのお問い合わせに回答するため\n- 利用規約に違反したユーザーへの対応のため",
    usage_title: "第3条（情報の利用目的）",
  },
} as const;

export type PrivacyContent = (typeof privacyContent)[keyof typeof privacyContent];
