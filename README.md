# AI Agent Best Practices

AIエージェントに関するベストプラクティス記事のURL一覧と、ローカル保存用スクリプトを管理するリポジトリです。

## SingleFile HTML として保存する

このリポジトリでは、記事本文のアーカイブはGitHubにpushせず、ローカルPCに保存する前提です。

### セットアップ

```bash
npm install
```

### 保存対象を確認する

```bash
npm run save:singlefile:dry-run
```

### 保存する

```bash
npm run save:singlefile
```

`articles.csv` を読み込み、`status` が `pending` または `failed` の記事を次の形式で保存します。

```text
singlefile/<source>/<id>.html
```

例:

```text
singlefile/openai/openai_codex_best_practices.html
singlefile/anthropic/anthropic_building_effective_agents.html
```

保存が成功すると、`articles.csv` の次の列を更新します。

- `status`: `saved`
- `captured_at`: 保存日時
- `raw_path`: 保存したSingleFile HTMLの相対パス

### すべて再保存する

既存ファイルも上書きして保存したい場合は、次を実行します。

```bash
node scripts/save_singlefile.js --all --overwrite
```

## Git管理方針

記事本文のアーカイブはローカル保存専用です。`.gitignore` により、以下はGitHubにpushされません。

```text
singlefile/
html/
raw/
markdown/
```
