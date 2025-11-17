# タスク分析ダッシュボードの使い方

output配下のMarkdown日報（`*-日報.md`）を集計し、ブラウザで可視化するための手順をまとめています。

## 1. データ生成
1. ルートディレクトリで以下を実行します。
   ```sh
   node scripts/parse-daily-reports.mjs
   ```
2. `output/task-analysis/daily_reports.json`が更新され、最新の集計結果が出力されます。

## 2. ページの閲覧
ローカルファイルをそのまま開くとブラウザのセキュリティ制限でJSONが読み込めない場合があります。簡易HTTPサーバーを立ててから`output/task-analysis/index.html`へアクセスしてください。

例:
```sh
npx serve output/task-analysis
```
またはVS Codeの「Live Server」等でも構いません。

## 3. 画面の見どころ
- 期間・キーワードフィルタで対象日報を絞り込み
- チェックリスト（本日の業務/明日の予定）の総数・完了率を自動計算
- 直近の成果・課題をハイライト表示
- 日次タイムラインで業務履歴を俯瞰

## 4. 構成ファイル
- `scripts/parse-daily-reports.mjs`: Markdownを解析してJSONを生成
- `output/task-analysis/index.html`: UI骨組み
- `output/task-analysis/style.css`: レイアウトとスタイル
- `output/task-analysis/app.js`: JSON読込・集計・描画処理
- `output/task-analysis/daily_reports.json`: 集計済みデータ

## 5. カスタマイズのヒント
- 日報テンプレートに新しいセクションを追加する場合は、スクリプト内の`SECTION_MAP`を拡張してください。
- 週報など別フォーマットを分析したい場合は、同じ要領で別スクリプトを用意し`daily_reports.json`とは別ファイルに出力すると安全です。
