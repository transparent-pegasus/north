# 実装計画: リサーチボタン制限改善・再分解ラベル・内容洗練バグ修正

## 概要

本計画は、`docs/todo.md` に記載された3つのタスクに基づき、リサーチ機能の制限挙動の改善、分解ボタンのラベル修正、および内容洗練のレンダリングバグの修正を行うことを目的とする。

## タスク一覧

### 1. リサーチボタンの制限挙動の改善

- **現状**: `ControlPanel.tsx` L784-791 で、リサーチ回数が上限に達した場合、アクションの「リサーチ」ボタン自体がロックされ、モーダルが開けない。
- **あるべき姿**: 「リサーチ」ボタンは常にモーダルを開けるようにし、モーダル内の「自動検索」タブの「リサーチを実行」ボタンのみを制限到達時にロックする。手動追加は制限の対象外。
- **対象ファイル**:
  - `frontend/components/ControlPanel.tsx`: リサーチボタンの `onClick` から制限チェックを除去し、常に `setIsResearchModalOpen(true)` を実行するように変更。ボタンのスタイルも制限状態に応じた変更を除去。
  - `frontend/components/ResearchModal.tsx`: `usage` と `LIMITS` の情報を受け取れるように props を追加する。自動リサーチの「リサーチを実行」ボタンに対し、制限到達時に `disabled` とし、制限到達のメッセージを表示する。
- **実装方針**:
  - `ResearchModal` に `isResearchLimitReached: boolean` props を追加する。
  - `ControlPanel.tsx` で `ResearchModal` に `isResearchLimitReached={usage.research >= LIMITS.research}` を渡す。
  - `ResearchModal` 内の自動検索タブの実行ボタンで `isResearchLimitReached` が `true` の場合、`disabled` にし、ボタンテキストに「(制限到達)」を追記する。

### 2. ゴールの分解ボタンラベルの修正

- **現状**: `ControlPanel.tsx` L639 で `selectedNode.childCount && selectedNode.childCount > 0` によるラベル切替が実装済み。
- **あるべき姿**: todo.md の記述「ゴールの子に理想の状態が存在する場合は『分解を実行』を『再分解を実行』で置き換える」はすでに実装されている。
- **確認結果**: 現在のコード（L639）は要件通りに動作しているため、**追加の変更は不要**。

### 3. 内容洗練のレンダリングバグの修正

- **現状**: 内容洗練のレスポンスは正常に受信され、ストアに保存されるが、提案の紐づく理想の状態をクリックした際に React Error #31「Objects are not valid as a React child (found: object with keys {content, id})」が発生する。
- **原因分析**:
  1. `TreeList.tsx` L387-388 で `ideal.condition?.content`（string）と `ideal.currentState?.content`（string）が `selectedNode` に渡される。
  2. `page.tsx` L143-189 のツリー同期ロジックで、`findNode` がツリーの `IdealState` オブジェクト全体を見つけ、`{ ...found, type: selectedNode.type }` として `selectedNode` を更新する。
  3. この時、`found.condition` は `{ id: string, content: string }` オブジェクトであり、`found.currentState` も同様。
  4. 結果、`selectedNode.condition` が string ではなく **オブジェクト** になる。
  5. `ControlPanel.tsx` L902-903 で `currentCondition={selectedNode.condition}`、`currentCurrentState={selectedNode.currentState}` として `RefineProposalModal` に渡される。
  6. `RefineProposalModal.tsx` L90、L108 で `{currentCurrentState || "(未設定)"}` や `{currentCondition || "(未設定)"}` としてレンダリングされるとき、オブジェクトが React の子要素として渡され、Error #31 が発生する。
- **対象ファイル**:
  - `frontend/app/page.tsx`: ツリー同期ロジックで `selectedNode` を更新する際、`condition` と `currentState` をオブジェクトから string に正規化する。
- **実装方針**:
  - `page.tsx` L179 の `const newNode = { ...found, type: selectedNode.type };` を修正し、`condition` と `currentState` のフィールドを `content` プロパティの文字列に正規化する。
  - 具体的には:
    ```typescript
    const newNode = {
      ...found,
      type: selectedNode.type,
      condition: found.condition?.content ?? found.condition,
      currentState: found.currentState?.content ?? found.currentState,
    };
    ```
  - `Goal` の場合の同期ロジック（L165）も同様に、オブジェクトのプロパティが `selectedNode` に混入しないよう確認する。ゴールには `condition` / `currentState` がないため変更不要。

## 手動確認チェックリスト

- [x] リサーチ回数が上限に達した状態で「リサーチ」ボタンをクリックし、モーダルが開くことを確認する。
- [x] モーダル内の「自動検索」タブで「リサーチを実行」ボタンが無効化（disabled）されていることを確認する。
- [x] モーダル内の「手動追加」タブは制限に関係なく利用できることを確認する。
- [x] ゴールに「理想の状態」が存在する場合、ボタンラベルが「再分解を実行」になっていることを確認する。
- [x] ゴールに「理想の状態」が存在しない場合、ボタンラベルが「分解を実行」になっていることを確認する。
- [x] 内容洗練を実行し、成功後に該当の「理想の状態」をクリックしてもエラーが発生せず、提案モーダルが正しく表示されることを確認する。
- [ ] `make verify` が通過すること。
