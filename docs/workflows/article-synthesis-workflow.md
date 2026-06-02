# Article synthesis workflow

このドキュメントは、公開記事のZIPからAIエージェントのベストプラクティス記事を生成し、日本語版に翻訳するまでの手順です。

## 入力

- 公開記事を集めたZIP
- 必要に応じて、複数モデルまたは複数プロンプトで生成した分類JSONL

## 出力

- `classification.jsonl`
- `final_classification.jsonl`
- `theme_clusters.jsonl`
- `principles_corrected_traceability.jsonl`
- `article_outline.md`
- `ai_agent_domain_glossary_corrected.jsonl`
- `final_article.md`
- `publication_review.md`
- `final_article_public_revised.md`
- `final_article_public_ja.md`

## 手順

### 1. 記事を分類する

`prompts/article-synthesis/01-classify-articles-jsonl.md` を使い、記事ZIPから `classification.jsonl` を作ります。

重要なのは、1記事を1要約にしないことです。記事内の主張をテーマ単位に分解します。

### 2. 分類結果を裁定する

複数の分類結果がある場合は、`prompts/article-synthesis/02-adjudicate-classifications.md` を使います。

片方をベース、もう片方をレビュー候補として扱います。必ず元記事に戻って判断します。

### 3. テーマをクラスタリングする

`prompts/article-synthesis/03-cluster-themes.md` を使い、`final_classification.jsonl` から `theme_clusters.jsonl` を作ります。

タグで単純分類するのではなく、意味の近い主張を横断的にまとめます。

### 4. 原則に抽象化する

`prompts/article-synthesis/04-create-principles.md` を使い、`theme_clusters.jsonl` から `principles.jsonl` を作ります。

必要に応じて、クラスタIDからtopic IDを再計算し、`principles_corrected_traceability.jsonl` を作ります。

### 5. 記事アウトラインを作る

`prompts/article-synthesis/05-create-article-outline.md` を使い、`article_outline.md` を作ります。

ここでは本文を書きません。章立て、各章の役割、使う原則、代表topic IDを決めます。

### 6. ドメイン用語集を作る

`prompts/article-synthesis/06-create-domain-glossary-jsonl.md` を使い、記事ZIPから用語集JSONLを作ります。

用語集は、記事作成と翻訳の用語統一に使います。

### 7. 英語の最終記事を書く

`prompts/article-synthesis/07-write-final-article.md` を使い、`final_article.md` を作ります。

この段階では、必要なら内部トレーサビリティIDを残しても構いません。

### 8. 公開前レビューを行う

`prompts/article-synthesis/08-publication-review.md` を使い、`publication_review.md` を作ります。

公開記事としての読みやすさ、重複、密度、用語、内部メタデータの扱いをレビューします。

### 9. 公開用英語記事へ編集する

`prompts/article-synthesis/09-edit-public-article.md` を使い、`final_article_public_revised.md` を作ります。

内部IDを削除し、公開記事としての読みやすさを整えます。

### 10. 日本語に翻訳する

`prompts/article-synthesis/10-translate-to-japanese.md` を使い、`final_article_public_ja.md` を作ります。

翻訳では、Markdown構造と表を保ち、用語集に従って技術用語を統一します。

## レビュー観点

各ステップの完了後、以下を確認します。

- JSONLは妥当か
- 元記事へのトレーサビリティが残っているか
- テーマ分割が粗すぎないか、細かすぎないか
- 記事本文で一般論が混ざりすぎていないか
- 公開版から内部メタデータが消えているか
- 日本語訳で用語が揺れていないか
