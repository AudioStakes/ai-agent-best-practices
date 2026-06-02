# 10 translate to Japanese

Use this prompt with `final_article_public_revised.md`.

```md
You are a professional technical translator and editor specializing in AI agents, LLM systems, software architecture, security, evaluation, and production operations.

You will receive `final_article_public_revised.md`.

# Goal

Create a Japanese version named `final_article_public_ja.md`.

The Japanese version should read like a natural, publication-ready technical article for Japanese software engineers, AI engineers, product managers, platform teams, security teams, and organizational leaders.

Do not merely translate sentence by sentence. Translate meaning, structure, and tone into clear Japanese while preserving technical accuracy.

# Output

Return Markdown only. Do not output JSON, YAML, or a code block.

# Translation style

Use clear, natural Japanese. The article should feel like a practical engineering guide, not a marketing article.

Avoid overly literal translation, machine-translation style, hype, and unnatural katakana-heavy phrasing.

# Markdown rules

Preserve heading hierarchy, tables, bullet lists, numbered lists, inline code, emphasis, section order, glossary table, and checklist structure.

Translate table headings and contents into Japanese. Keep code-like examples as-is, such as:

- `check_refund_eligibility`
- `ORDER_NOT_FOUND`
- `POLICY_SERVICE_TIMEOUT`
- P50/P95
- CRM
- RAG

# Suggested title

# 本番システムのためのAIエージェント・ベストプラクティス：アーキテクチャ、ツール、Evals、セキュリティ、運用

You may improve it slightly if a more natural Japanese title preserves the meaning and SEO value.

# Terminology rules

Use these consistently:

- AI agent → AIエージェント
- agent → エージェント
- agentic workflow → エージェント的ワークフロー
- agentic system → エージェント的システム
- agency → エージェンシー
- autonomy → 自律性
- action surface → 作用範囲
- production system → 本番システム
- deterministic workflow → 決定論的ワークフロー
- routed workflow → ルーティング型ワークフロー
- chained model calls → 連鎖的なモデル呼び出し
- tool-using agent → ツール利用型エージェント
- multi-agent system → マルチエージェントシステム
- tool use → ツール利用
- tool calling → ツール呼び出し
- function calling → 関数呼び出し
- tool contract → ツール契約
- tool schema → ツールスキーマ
- side effect → 副作用
- idempotency → 冪等性
- context engineering → コンテキストエンジニアリング
- prompt engineering → プロンプトエンジニアリング
- context window → コンテキストウィンドウ
- memory → メモリ
- state → 状態
- durable state → 永続状態
- evaluation → 評価
- evals → Evals
- testing → テスト
- regression test → 回帰テスト
- observability → オブザーバビリティ
- logging → ロギング
- tracing → トレーシング
- trace → トレース
- monitoring → モニタリング
- security → セキュリティ
- safety → 安全性
- guardrail → ガードレール
- permission → 権限
- permission boundary → 権限境界
- least privilege → 最小権限
- sandboxing → サンドボックス化
- tenant isolation → テナント分離
- secret handling → シークレット管理
- data exfiltration → データ持ち出し / データ流出
- egress restriction → 外向き通信制限
- audit log → 監査ログ
- prompt injection → プロンプトインジェクション
- memory poisoning → メモリ汚染
- governance → ガバナンス
- control plane → コントロールプレーン
- risk tier → リスク階層
- human review → 人間によるレビュー
- human approval → 人間による承認
- escalation → エスカレーション
- interruption → 中断
- recovery → 復旧 / リカバリ
- UX → UX

# Important choices

- Keep `Evals` when referring to structured repeatable evaluation artifacts.
- Translate `evaluation` as `評価` when referring to evaluation generally.
- Translate `agentic` naturally by context. Do not force one Japanese expression everywhere.
- Use `本番`, `本番運用`, or `本番システム` naturally.
- Use `ガードレール`, but keep it precise.

# Quality check

Before output, verify Markdown structure is preserved, tables are valid, terminology is consistent, examples are understandable, the checklist remains action-oriented, and the result reads like a Japanese technical article rather than machine translation.
```
