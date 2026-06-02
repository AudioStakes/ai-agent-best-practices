# AI Agent Best Practices Article Synthesis Workflow

このフォルダは、公開記事のZIPを入力として、AIエージェントのベストプラクティス記事を作り、最終的に日本語版の記事まで生成するための手順とプロンプトをまとめたものです。

## 目的

複数の公開記事をただ要約するのではなく、以下の中間成果物を段階的に作ります。

1. 記事ごとのテーマ分類データ
2. 裁定済みの最終分類データ
3. 横断テーマクラスタ
4. 設計原則
5. 記事アウトライン
6. ドメイン用語集
7. 英語の完成記事
8. 公開用に編集した英語記事
9. 日本語訳記事

この手順の狙いは、LLMに一気に「まとめ記事を書いて」と頼むのではなく、根拠と構造を保ったまま、分析結果を記事へ変換することです。

## 推奨ディレクトリ構成

このリポジトリでは、次のように配置するのがおすすめです。

```text
ai-agent-best-practices/
  prompts/
    article-synthesis/
      01-classify-articles-jsonl.md
      02-adjudicate-classifications.md
      03-cluster-themes.md
      04-create-principles.md
      05-create-article-outline.md
      06-create-domain-glossary-jsonl.md
      07-write-final-article.md
      08-publication-review.md
      09-edit-public-article.md
      10-translate-to-japanese.md
  docs/
    workflows/
      article-synthesis-workflow.md
  data/
    processed/
      final_classification.jsonl
      theme_clusters.jsonl
      principles_corrected_traceability.jsonl
      ai_agent_domain_glossary_corrected.jsonl
  articles/
    ai-agent-best-practices-production-systems.md
    ai-agent-best-practices-production-systems.ja.md
```

### 配置方針

- `prompts/article-synthesis/`: 再利用するプロンプトを保存する場所
- `docs/workflows/`: 手順書を保存する場所
- `data/processed/`: LLMで生成した中間成果物を保存する場所
- `articles/`: 公開用の記事を保存する場所

もしリポジトリを軽く保ちたい場合は、`data/processed/` は `.gitignore` 対象にしても構いません。ただし、記事の根拠や再生成可能性を重視するなら、JSONLの中間成果物も残すことをおすすめします。

## 全体手順

### Step 1: 記事ZIPをテーマ単位で分類する

入力:

- 記事をまとめたZIP

出力:

- `classification.jsonl`

使用プロンプト:

- `prompts/01-classify-articles-jsonl.md`

ポイント:

- 1記事を1テーマに押し込めない
- 記事内の複数テーマを `theme_record` として分解する
- JSONLで1行1テーマにする

### Step 2: 複数出力を比較・裁定する

入力:

- `classification.jsonl`
- `out.jsonl` など別モデル/別実行の分類結果
- 元記事ZIP

出力:

- `final_classification.jsonl`
- `adjudication_report.md`

使用プロンプト:

- `prompts/02-adjudicate-classifications.md`

ポイント:

- 単純マージしない
- 元記事を正とする
- 片方の出力はベース、もう片方はレビュー候補として使う

### Step 3: テーマクラスタを作る

入力:

- `final_classification.jsonl`

出力:

- `theme_clusters.jsonl`

使用プロンプト:

- `prompts/03-cluster-themes.md`

ポイント:

- `primary_tag` だけで単純分類しない
- 意味が近いテーマを横断クラスタにする
- 各クラスタに `source_topic_ids` を保持する

### Step 4: 設計原則を作る

入力:

- `theme_clusters.jsonl`

出力:

- `principles.jsonl`
- 必要なら `principles_corrected_traceability.jsonl`

使用プロンプト:

- `prompts/04-create-principles.md`

ポイント:

- 17個程度のクラスタを10〜12個程度の原則に圧縮する
- 記事の主張として使える粒度にする
- `source_cluster_ids` と `source_topic_ids` を維持する

### Step 5: 記事アウトラインを作る

入力:

- `principles_corrected_traceability.jsonl`

出力:

- `article_outline.md`

使用プロンプト:

- `prompts/05-create-article-outline.md`

ポイント:

- 原則をそのまま並べない
- 読者にとって自然な流れに再構成する
- 設計、評価、運用、ガバナンスへ流れる構成にする

### Step 6: ドメイン用語集を作る

入力:

- 記事ZIP

出力:

- `ai_agent_domain_glossary_corrected.jsonl`

使用プロンプト:

- `prompts/06-create-domain-glossary-jsonl.md`

ポイント:

- 表記揺れを検出する
- canonical term / aliases / related terms / distinctions を整理する
- 後続の記事執筆・翻訳で用語統一に使う

### Step 7: 英語の最終記事を書く

入力:

- `article_outline.md`
- `principles_corrected_traceability.jsonl`
- `ai_agent_domain_glossary_corrected.jsonl`

出力:

- `final_article.md`

使用プロンプト:

- `prompts/07-write-final-article.md`

ポイント:

- 実務者向けの技術記事として書く
- hypeを避ける
- 表やチェックリストを含める

### Step 8: 公開前レビューを行う

入力:

- `final_article.md`

出力:

- `publication_review.md`

使用プロンプト:

- `prompts/08-publication-review.md`

ポイント:

- 重複、密度、用語、構成、公開記事らしさをレビューする
- 内部メタデータを残すかどうか判断する

### Step 9: 公開用英語記事に編集する

入力:

- `final_article.md`
- `publication_review.md`
- `ai_agent_domain_glossary_corrected.jsonl`

出力:

- `final_article_public.md`
- `final_article_public_revised.md`

使用プロンプト:

- `prompts/09-edit-public-article.md`

ポイント:

- 内部IDを削除する
- 読みやすくする
- SEOを少し意識したタイトルにする
- glossaryやsource index導線を整える

### Step 10: 日本語に翻訳する

入力:

- `final_article_public_revised.md`

出力:

- `final_article_public_ja.md`

使用プロンプト:

- `prompts/10-translate-to-japanese.md`

ポイント:

- 直訳ではなく、日本語の技術記事として自然にする
- 用語ルールを守る
- Markdown構造、表、チェックリストを維持する

## 今回の最終成果物

今回の日本語記事は、`final_article_public_revised.md` を翻訳して作成したものです。最終日本語版は次の位置に置くのがおすすめです。

```text
articles/ai-agent-best-practices-production-systems.ja.md
```

英語版は次の位置です。

```text
articles/ai-agent-best-practices-production-systems.md
```

## 運用上の注意

- 各ステップの出力は必ず保存する
- JSONLは後から差分比較・再集計できるように残す
- LLM出力を単純に信用せず、裁定ステップを挟む
- 記事本文を書く前に必ずクラスタリングと原則化を行う
- 翻訳前に用語集を確定させる
