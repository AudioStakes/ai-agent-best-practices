# AI Agent Best Practices Knowledge Base

AIエージェントを使った開発経験がある人向けに、OpenAI / Anthropic / Google / Microsoft / LangChain などの主要な公式ドキュメントを横断整理したナレッジベースです。

単なるリンク集ではなく、エージェントの設計・評価・運用・コーディング活用に関するベストプラクティスをテーマ別に整理し、自分の開発フローを見直すための観点を提供します。

> **対象時点: 2026年5月**  
> このナレッジベースは、2026年5月時点で公開されている主要な公式ドキュメントをもとに整理しています。最新の仕様や推奨事項は、各公式ドキュメントを確認してください。

## 公開ページ

GitHub Pages で公開するトップページは、`docs/index.md` を元に生成される `docs/index.html` です。

- [docs/index.md](./docs/index.md)
- [docs/index.html](./docs/index.html)
- 公開対象は `docs/` 配下です。
- 公開用ファイルの再生成は `npm run build:pages` で行います。
- 公開前の確認項目は [docs/publishing-checklist.md](./docs/publishing-checklist.md) にまとめています。

公開物は `docs/` 配下にまとめてあり、`docs/index.html` から各章と用語集に辿れます。

GitHub Pages を有効化した後は、次の形式のURLで公開される想定です。

```text
https://audiostakes.github.io/ai-agent-best-practices/
```

## 対象読者

AIエージェントを使った開発経験があり、自己流の使い方から一歩進んで、主要な公式ドキュメントに基づいてエージェント活用を改善したい人向けです。

具体的には、次のような人を想定しています。

- AIエージェントと一緒にコーディングしている人
- AIエージェントを使ってアプリやツールを作ったことがある人
- エージェントだけに任せて、自分はコーディングしない形で開発したことがある人
- 特定ツールの経験に閉じず、エージェント設計・評価・運用の考え方を横断的に知りたい人
- 自分の開発フローを、主要な公式ドキュメントに基づいて見直したい人

## このナレッジベースで得られること

OpenAI / Anthropic / Google / Microsoft / LangChain などの主要な公式ドキュメントを横断し、エージェントの設計・評価・運用・コーディング活用に共通するベストプラクティスを整理できます。

読み終えることで、自分のエージェント活用を、思いつきや経験則だけでなく、公式ドキュメントに基づいて見直せるようになります。

## 読み方

このナレッジベースは、最初から順番に読む必要はありません。

章ごとにテーマを分けているため、いま知りたい内容や、自分の開発で見直したい領域から読めます。

## 対象外

このナレッジベースは、次の目的には向いていません。

- AIエージェントをまだ使ったことがない人向けの入門
- AIエージェントを使い始めたばかりの人向けのチュートリアル
- AIエージェント関連の最新ニュースの収集
- 特定ツールの詳しい使い方や操作手順の解説

## コンテンツ構成

現在のメインコンテンツは、ルート配下に置いた静的サイトです。AIエージェント関連のベストプラクティス記事をタグ別にまとめ、用語集へのリンクとポップアップを付けて閲覧しやすくしています。

主な入口:

- [index.html](./index.html)
- [用語集](./domain-glossary.html)
- [README.html](./README.html)

主なファイルとディレクトリ:

```text
.
├── index.html
├── domain-glossary.html
├── domain-glossary.md
├── tag-guides/
├── tests/
├── style.css
├── term-popup.js
├── serve.sh
├── articles.csv
├── docs/
└── README.md
```

- `tag-guides/`: タグ別の記事 HTML と Markdown
- `domain-glossary.md` / `domain-glossary.html`: 用語集の原本と閲覧版
- `docs/`: GitHub Pages 公開用トップページと公開方針ドキュメント
- `tests/`: ローカル表示の UI 挙動を確認する Playwright テスト
- `style.css` / `term-popup.js`: 共通の見た目と用語ポップアップ

## ローカルで見る

```bash
./serve.sh
```

ブラウザで次を開きます。

```text
http://localhost:8000/docs/
```

公開用ファイルを再生成したあとは、`http://localhost:8000/docs/` か `http://localhost:8000/docs/index.html` を開いて、章の冒頭説明と相互リンクを確認できます。

## GitHub Pages で公開する

GitHub Pages で公開する場合は、リポジトリ設定で次のように指定します。

```text
Settings
→ Pages
→ Build and deployment
→ Source: Deploy from a branch
→ Branch: main
→ Folder: /docs
```

この設定により、`docs/index.html` が公開トップになります。

## 公開前チェック

公開前は、次の順で確認します。

```bash
npm run build
npm run verify
npm run verify:pages
```

`npm run build` は `docs/` 配下の公開物を再生成します。`npm run verify:pages` は `docs/` 配下のファイル存在、章の必須要素、ローカルリンク切れを確認します。

## 再生成手順

記事の保存や抽出の手順は、[workflow/README.md](./workflow/README.md) にまとめています。

## 公開ページの設計メモ

公開ページの問題設定は、[docs/public-page-problem-statement.md](./docs/public-page-problem-statement.md) にまとめています。
