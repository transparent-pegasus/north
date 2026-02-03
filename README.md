# North

「North」は、ユーザーが設定した「ゴール」を達成可能な「理想の状態」や「条件」に分解し、必要な情報をリサーチして可視化するアプリケーションです。
AIによる思考支援と自動リサーチ機能を組み合わせ、抽象的な目標を具体的な行動計画へと落とし込むサポートを行います。

## 主な機能

1.  ゴール分解ツリー (Tree Visualization)
    - ゴールを頂点とし、それを達成するための「理想の状態」をツリー状に展開して可視化。
    - インタラクティブにノードの追加・編集・削除が可能。
2.  AIによる思考支援 (AI Assistance)
    - 自動分解: ゴールや理想の状態を、AIが自動的に具体的な要素に分解。
    - 熟考プロセス: AIが思考サイクルを回し、解像度の高い提案を実施。
3.  リサーチ機能 (Research Assistant)
    - 学術・一般ソース（OpenAlex, arXiv, Wikipediaなど）からの情報収集。
    - 検索結果の要約とツリーへの紐付け機能。
4.  マルチプラットフォーム
    - Google認証によるデータ管理。
    - レスポンシブデザインによるモバイル対応。
    - Androidアプリ化（TWA）対応予定。

## 技術スタック

- Frontend: Next.js 15, Hero UI, Tailwind CSS v4, Biome
- Backend: Firebase Functions (Node.js), Express
- Database: Firestore
- Authentication: Firebase Authentication
- AI: Google Gemini API
- Tools: pnpm, Make, Firebase CLI

## 環境構築 (Windows)

本プロジェクトでは、開発ツールの管理に Scoop、タスクランナーに Make、Node.js のバージョン管理に fnm を使用することを推奨しています。

### 1. 必須ツールのインストール

PowerShell で以下を実行し、Scoop, Make, fnm をインストールしてください。

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex
scoop install make fnm
```

fnm を使用して `.nvmrc` に記載されたバージョンの Node.js をインストール・適用します。

### 2. 依存関係のインストール

プロジェクトのルートディレクトリで実行してください。

```powershell
pnpm install
```

### 3. 環境変数の設定

`.env` ファイルを作成し、必要なキーを設定します。

frontend/.env:

```powershell
# エディタで作成・編集
New-Item frontend/.env -ItemType File
# 以下の内容を設定
NEXT_PUBLIC_API_URL="http://127.0.0.1:5001/north-c409d/asia-northeast1/api"
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_SHOW_DEBUG="false"
```

backend/.env:

```powershell
New-Item backend/.env -ItemType File
# 以下の内容を設定
GOOGLE_API_KEY="your_google_api_key_here"
```

## 開発・運用

このプロジェクトは `Makefile` によりタスクが管理されています。すべてのコマンドは PowerShell 上で実行可能です。

### ローカル開発 (推奨)

```powershell
make dev
```

- 動作:
  1.  `make build-local` が実行され、デバッグ用ビルド (`frontend/out-debug`) が作成されます。
  2.  `firebase.debug.json` を使用して Firebase Emulators が起動します。
  3.  `http://localhost:5000` でホスティングされたアプリにアクセスできます。

### ビルドとデプロイ

```powershell
# 本番ビルド (frontend/out に出力)
make build

# デプロイ (自動的に make build が実行されます)
make deploy
```

- リリースノート: ビルド時に `scripts/generate-releases.js` が実行され、`docs/releases/*.md` からHTML形式のリリースノートが生成されます。

### コード品質管理

プロジェクトの規定により、実装サイクルの最後に必ず実行してください。

```powershell
make lint    # 静的解析 (Biome & ESLint)
make format  # 自動整形 (Biome)
```

## ディレクトリ構造

- `frontend/`: Next.js アプリケーション
- `backend/`: Firebase Functions (APIサーバー)
- `docs/`: ドキュメント・リリースノート
- `scripts/`: ヘルパースクリプト

## ライセンス

This project is private.
