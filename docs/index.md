# AI Agent Best Practices Knowledge Base

> **対象時点: 2026年5月**  
> このナレッジベースは、2026年5月時点で公開されている主要な公式ドキュメントをもとに整理しています。最新の仕様や推奨事項は、各公式ドキュメントを確認してください。

AIエージェントを使った開発経験がある人向けに、OpenAI / Anthropic / Google / Microsoft / LangChain などの主要な公式ドキュメントを横断整理したナレッジベースです。

単なるリンク集ではなく、エージェントの設計・評価・運用・コーディング活用に関するベストプラクティスをテーマ別に整理し、自分の開発フローを見直すための観点を提供します。

## これは何か

このサイトは、AIエージェントをすでに使っている人が、公式ドキュメントを横断しながら設計判断を見直すための読み物です。

## 誰向けか

AIエージェントを使った開発経験があり、自己流の使い方から一歩進んで、主要な公式ドキュメントに基づいてエージェント活用を改善したい人向けです。

## 30秒で選ぶ章

1. [エージェント設計系](tag-guides/01-agent-design.html) - まずエージェントが必要か、どこまで自律化すべきかを見極める章です。([Markdown原文](tag-guides/01-agent-design.md))
2. [ワークフロー設計系](tag-guides/02-workflow-design.html) - 直列・分岐・反復・レビューを組み合わせて、予測可能な流れを作る観点をまとめています。([Markdown原文](tag-guides/02-workflow-design.md))
3. [ツール利用系](tag-guides/03-tool-use.html) - ツール定義、引数設計、失敗時の返し方など、エージェントが外部世界を扱う土台を整理しています。([Markdown原文](tag-guides/03-tool-use.md))
4. [コンテキスト設計系](tag-guides/04-context-engineering.html) - 何を渡し、何を省き、どう状態を持たせるかを考える章です。([Markdown原文](tag-guides/04-context-engineering.md))
5. [評価系](tag-guides/05-evals.html) - 正しさ・再現性・安全性をどう測るかをまとめ、改善サイクルを作るための視点を提供します。([Markdown原文](tag-guides/05-evals.md))
6. [コーディングエージェント系](tag-guides/06-coding-agents.html) - コード生成やリポジトリ操作を任せるときの判断軸と、壊しにくい使い方を整理しています。([Markdown原文](tag-guides/06-coding-agents.md))
7. [本番運用系](tag-guides/07-production-operations.html) - 実運用に入れる前提で、監視・回復・人間確認・責任分界を考える章です。([Markdown原文](tag-guides/07-production-operations.md))
8. [セキュリティ・サンドボックス系](tag-guides/08-security-sandboxing.html) - 権限、隔離、秘密情報、危険操作の扱いを中心に、事故を防ぐ観点を整理しています。([Markdown原文](tag-guides/08-security-sandboxing.md))
9. [マルチエージェント系](tag-guides/09-multi-agent.html) - 役割分担や委譲が本当に必要な場面だけ、複数エージェント化を検討するための章です。([Markdown原文](tag-guides/09-multi-agent.md))
10. [ガバナンス系](tag-guides/10-governance.html) - 組織利用で必要になる方針、責任、ルール、運用設計を横断的に見直す章です。([Markdown原文](tag-guides/10-governance.md))

## 何を読めばよいか

最初の一冊を選ぶなら、設計の入口として [エージェント設計系](tag-guides/01-agent-design.html) から読むのが最も取りかかりやすいです。

その後は、自分の課題に合わせて [ツール利用系](tag-guides/03-tool-use.html) や [評価系](tag-guides/05-evals.html) に進むと、実装と検証の往復がしやすくなります。

## 公開範囲

- この公開トップは `docs/index.md` です。
- 各章は `docs/tag-guides/*.html` と `docs/tag-guides/*.md` から読めます。
- 用語集は `docs/domain-glossary.html` と `docs/domain-glossary.md` で参照できます。

## 対象外

このナレッジベースは、次の目的には向いていません。

- AIエージェントをまだ使ったことがない人向けの入門
- AIエージェントを使い始めたばかりの人向けのチュートリアル
- AIエージェント関連の最新ニュースの収集
- 特定ツールの詳しい使い方や操作手順の解説

## 補足

公開ページの問題設定は、[public-page-problem-statement.md](public-page-problem-statement.md) にまとめています。
