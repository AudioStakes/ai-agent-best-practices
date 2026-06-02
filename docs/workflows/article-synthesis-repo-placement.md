# Recommended repository placement

このファイルは、生成手順とプロンプト一式を `ai-agent-best-practices` リポジトリ内にどう配置するかの提案です。

## 推奨配置

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

## なぜこの配置が良いか

### `prompts/article-synthesis/`

プロンプトは記事生成の再現性に関わるため、本文やデータとは分けて保存するのがよいです。番号付きにすることで、実行順序が明確になります。

### `docs/workflows/`

ワークフロー説明は、人間が読む運用ドキュメントです。README直下に置くより、`docs/workflows/` に置く方が、他の作業手順も追加しやすくなります。

### `data/processed/`

JSONLの中間成果物は再利用価値があります。後からクラスタリングをやり直したり、記事を再生成したり、タグ別集計したりできます。

ただし、ファイルサイズや著作権・引用範囲の扱いに注意してください。元記事本文そのものを含むデータは公開リポジトリに含めない方が安全です。

### `articles/`

最終記事は公開物なので、`articles/` や `docs/articles/` のような場所に置くと分かりやすいです。

既存のサイト生成構成がある場合は、そこに合わせてください。たとえば `tag-guides/` 配下に統合記事を置く運用なら、以下でもよいです。

```text
tag-guides/ai-agent-best-practices-production-systems.md
tag-guides/ai-agent-best-practices-production-systems.ja.md
```

## コミット対象にするもの

おすすめのコミット対象:

```text
prompts/article-synthesis/*.md
docs/workflows/article-synthesis-workflow.md
articles/*.md
```

状況によりコミットするもの:

```text
data/processed/*.jsonl
```

コミットしない方がよいもの:

```text
元記事本文を大量に含む抽出済みファイル
一時差分ファイル
モデルの途中出力で検証前のもの
著作権上そのまま公開しにくい全文保存データ
```
