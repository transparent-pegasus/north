# エージェント定義

- 役割: あなたは熟練したWebエンジニアです。保守性が高く、シンプルなコードを記述します。
- 目的: ゴール達成のための「ツリー」分解・リサーチアプリケーション「north」の構築。
- 行動指針:
  - 仕様の遵守: `AGENTS.md` に記載された仕様（データ構造、ルール）を正として行動する。
  - ドキュメントファースト: 実装の前に設計（`AGENTS.md`）を更新し、整合性を保つ。
  - KISS原則: 必要以上に複雑な構成を避け、シンプルさを維持する。
  - リリースノート: `docs/releases/` 配下に `YYYYMMDD_M.m.md` (例: `20260202_1.0.md`) の形式で作成する。
  - 既知の問題: `docs/known_issues/` 配下に `YYYYMMDDHHMMSS_簡潔な問題名.md` (例: `20260201170000_firestore_connection_issue.md`) の形式で作成・管理する。
  - 品質管理: プロジェクト作成時に指定が無い限り、実装サイクルの最後に以下を実行する。
    - Verification Loop: `make verify` を実行し、Linter によるチェック・修正、および `make build-local` によるビルド検証をパスすることを確認する。
    - Log Cleanup: `make verify` コマンド内の処理に従い、検証完了後に `.tmp/` 内が空であることを確認する。

# [0] プロジェクト概要

- 名称: north
- 目的: ユーザーが設定した「ゴール」を達成可能な「理想の状態」や「条件」に分解し、必要な情報をリサーチして可視化するアプリケーション。

# [1] 定義

- 「ツリー」: 「ゴール」を頂点とした木構造。
- 「要素」: ツリーを構成するノード。
  - 「ゴール」: 最上位の目標。直下の「理想の状態」を管理する。
  - 「理想の状態」: ゴール達成に必要な望ましい状態。フラットに管理される。
    - 「現在の状態」: 理想の状態に対する現在の状況 (HasOne)。
    - 「条件」: 現在の状態から理想の状態へ移行するための要件 (HasOne)。
    - 「リサーチ」: その状態を実現するための調査情報 (HasMany)。
- 「ユーザーデータ」: 各ユーザーのデータは独立して管理される (`users/{userId}` 配下)。
- 「熟考」: AIによる思考サイクル（入力→生成→反映→リセット）を行い、情報の解像度を高めるプロセス。
- 「再構成」: ゴールに基づき、必要な「理想の状態」を洗い出してツリーを構築・更新する機能。

# [2] データ構造 (TypeScript Interface)

```typescript
// --- Tree Structure ---

interface Tree {
  id: string;
  goal: Goal;
  createdAt: string;
  updatedAt: string;
}

interface ElementProposal {
  type: "decomposition" | "refinement";
  data: any;
  createdAt: string;
}

interface Goal {
  id: string;
  content: string; // ゴールの内容
  idealStates: IdealState[];
  pendingProposal?: ElementProposal | null;
}

interface IdealState {
  id: string;
  content: string; // 理想の状態
  currentState: CurrentState | null;
  condition: Condition | null;
  researchSpec: ResearchSpec | null;
  researchResults: ResearchResult[];
  pendingProposal?: ElementProposal | null;
}

interface CurrentState {
  id: string;
  content: string; // 現状
}

interface Condition {
  id: string;
  content: string; // 達成条件
}

// --- Research ---

type SourceType =
  | "openalex"
  | "semantic_scholar"
  | "arxiv"
  | "pubmed"
  | "wikipedia"
  | "reddit"
  | "sciencedaily"
  | "phys_org"
  | "mit_tech_review"
  | "ieee_spectrum"
  | "frontiers"
  | "hackaday";

interface ResearchSpec {
  source: SourceType;
  keywords: string[];
}

interface ResearchResult {
  id: string;
  source: SourceType;
  keywords: string[];
  results: SearchResultItem[];
  createdAt: string;
}

interface SearchResultItem {
  title: string;
  url: string;
  snippet?: string;
  authors?: string[];
  publishedDate?: string;
}
```

# [3] 機能要件

## 1. ツリー可視化

- ゴールを頂点とするグラフとして描画。
- 各ノード（要素）はインタラクティブに編集・詳細表示可能。
- モバイル対応: 狭い画面では下部ツールバーとモーダルによる操作を提供。

## 2. 要素分解・再構成

- トリガー: ユーザーのアクションで開始。
- 分解ロジック:
  - ゴール -> 理想の状態 (HasMany)
  - 理想の状態 -> 現在の状態 (HasOne), 条件 (HasOne)
- AI補完: 不足部分はAIが「熟考」（3周ループ）して埋める。
- 機能拡張:
  - 「理想の状態」を新しい「ツリー」のゴールとして昇格させる機能。

## 3. リサーチ機能

- 独自リサーチ:
  - `Puppeteer` および各種API (OpenAlex, Semantic Scholar, ArXiv, PubMed, Wikipedia) を使用してWebから情報取得。
  - 検索結果（タイトル、URL、スニペット）を候補リストとして保存・提示する。
  - 保存されたリサーチ結果は、分解および洗練プロセスのAIプロンプトに含まれ、より具体的な提案の生成に利用される。

## 4. 認証・管理

- タイトル画面:
  - ロゴ、サービス名、サブタイトルを表示。
  - ログイン（Google / 匿名）への誘導。
  - ※Productionビルドでは匿名ログインを非表示とし、Googleログインを必須とする。
- 認証基盤:
  - Firebase Authを使用。すべてのAPIリクエストでIDトークンの検証を行う。
- 利用制限 (Rate Limiting):
  - Free Plan制限として、以下のAI機能に1日あたりの回数制限を設ける。
    - 分解 (Decompose): 3回/日
    - 修正提案 (Refine): 3回/日
    - リサーチ (Research): 3回/日
  - 制限は `users/{uid}/daily_limit/{yyyy-mm-dd}` ドキュメントで管理する。

## 5. モバイルアプリ

- Android対応 (TWA):
  - BubbleWrap を使用してGoogle Play Storeへ配信可能な状態を維持する。
  - `twa-manifest.json` をルートに配置。

# [4] 技術スタック

- Frontend: Next.js, Hero UI
- Backend: Firebase Functions (Node.js), Express, Gemini API, Puppeteer + puppeteer-stealth, Firebase Auth
- Mobile Wrapper: BubbleWrap (Android TWA)
- Package Manager: pnpm
- Finder/Formatter: Biome
- Storage: Firestore (Production & Local Emulator), Markdown (Research outputs)

# [5] ルール

- コード変更時は必ず本ドキュメント `AGENTS.md` を更新する。
- パッケージ管理には必ず `pnpm` を使用する。`npm` や `yarn` によるインストールは厳禁とする。
- リサーチ結果は `[適切なパス]/[ソース名]/[タイトル].md` に保存する。
- 一連の作業（タスク）完了ごとに必ずBiomeによるフォーマットを実行する (`pnpm run format`)。

# [6] リリース・エンジニアリング

## 1. Web Deployment (Firebase)

- 事前準備: `firebase login` 済みであること。
- コマンド: `make deploy` または `pnpm build && cd backend && pnpm run build && firebase deploy`
- `firebase.json` リライト設定: `/api/` を Function `api` に、その他を `index.html` に転送設定済み。

## 2. Android App (BubbleWrap)

- 構成ファイル: `twa-manifest.json` (ルートディレクトリ)
- ビルド手順:
  1. BubbleWrap CLI のインストール: `npm i -g @bubblewrap/cli`
  2. 初期化 (初回のみ): `bubblewrap init --manifest twa-manifest.json`
  3. ビルド: `bubblewrap build`
- キー管理:
  - `android-keystore.jks` が生成されるため、安全に管理する。
  - `twa-manifest.json` 内の署名設定を参照。

# [7] ディレクトリ構造

- frontend: Next.js application
  - app: App Router root
  - components: UI Components
  - public: Static assets (icons, manifest.json)
- backend: Firebase Functions
  - src: Backend logic (Express app, tree operations, AI)
- types: Shared TypeScript definitions
- research: Markdown research outputs
