# Workflow

このディレクトリには、リポジトリ本体の静的サイトを再生成・保存するための手順とスクリプトだけをまとめています。

## 保存対象を確認する

```bash
npm run save:singlefile:dry-run
```

## SingleFile HTML として保存する

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

## メインコンテンツをMarkdownとして保存する

ナビゲーション、ヘッダー、フッターなどを除き、記事のメインコンテンツだけをMarkdownとして保存できます。本文中の画像もローカルに保存し、Markdown内の画像リンクをローカルパスに置き換えます。

保存対象を確認する場合:

```bash
npm run save:content:dry-run
```

実際に保存する場合:

```bash
npm run save:content
```

出力先:

```text
content/<source>/<id>.md
assets/<source>/<id>/image-001.<ext>
```

画像を保存せず、Markdownだけ保存する場合:

```bash
node workflow/scripts/save_content.js --no-images
```

既存Markdownを上書きして再作成する場合:

```bash
node workflow/scripts/save_content.js --all --overwrite
```

30日以上古いMarkdownだけ再作成する場合:

```bash
node workflow/scripts/save_content.js --all --refresh-days 30
```

## 保存済みSingleFileを一覧表示する

`npm run save:singlefile` を実行すると、保存処理のあとに次の一覧ページが生成されます。

```text
singlefile/index.html
```

ブラウザでこのファイルを開くと、ローカルに保存済みのSingleFile HTMLへリンクできます。

一覧ページだけ作り直したい場合:

```bash
npm run build:index
```

一覧ページには、タイトル・提供元・カテゴリ・保存状態・元URLへのリンクが表示されます。検索ボックスで絞り込みもできます。

### タイムアウトした記事をskipする

SingleFileの取得が長時間止まる場合に備えて、デフォルトで120秒のタイムアウトを設定しています。タイムアウトした記事は `failed` にして、次の記事へ進みます。

タイムアウト時間を変更する場合:

```bash
node workflow/scripts/save_singlefile.js --timeout-seconds 300
```

### 古い保存済みファイルだけ差し替える

既存ファイルは通常skipされます。保存済みファイルが指定日数より古い場合だけ再保存したい場合は、`--refresh-days` を使います。

例えば、30日以上古いファイルだけ差し替える場合:

```bash
node workflow/scripts/save_singlefile.js --all --refresh-days 30
```

`--all` を付けると、`saved` の行も確認対象になります。`--all` を付けない場合は、従来どおり `pending` または `failed` の行だけが対象です。

### すべて再保存する

既存ファイルも上書きして保存したい場合は、次を実行します。

```bash
node workflow/scripts/save_singlefile.js --all --overwrite
```

## 再生成の入口

`workflow/scripts/` にある 3 つのスクリプトが、記事保存と一覧生成の中心です。

- `workflow/scripts/save_singlefile.js`
- `workflow/scripts/save_content.js`
- `workflow/scripts/build_singlefile_index.js`
