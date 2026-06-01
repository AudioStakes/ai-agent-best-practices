# Workflow

このディレクトリには、リポジトリ本体の静的サイトを再生成・保存するための手順とスクリプトだけをまとめています。

## ディレクトリの役割

- `sources/` は一次情報の URL リストや capture metadata を置く場所です。
- `archive/` は Web から保存・抽出した中間成果物を置く場所です。
- `content/` は人間または ChatGPT が編集する原本 Markdown を置く場所です。
- `notes/` は ChatGPT の読書メモや synthesis draft を置く場所です。
- `site/` はサイト表示に必要な CSS と JavaScript を置く場所です。
- `dist/` は生成 HTML と公開可能な静的資産を置く場所です。

## 保存対象を確認する

```bash
npm run save:singlefile:dry-run
```

## SingleFile HTML として保存する

```bash
npm run save:singlefile
```

`sources/articles.csv` を読み込み、`status` が `pending` または `failed` の記事を次の形式で保存します。

```text
archive/singlefile/<source>/<id>.html
```

保存が成功すると、`sources/articles.csv` の次の列を更新します。

- `status`: `saved`
- `captured_at`: 保存日時
- `raw_path`: 保存した SingleFile HTML の相対パス

## メインコンテンツを Markdown として保存する

ナビゲーション、ヘッダー、フッターなどを除き、記事のメインコンテンツだけを Markdown として保存できます。本文中の画像もローカルに保存し、Markdown 内の画像リンクをローカルパスに置き換えます。

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
archive/extracted/<source>/<id>.md
archive/assets/<source>/<id>/image-001.<ext>
```

画像を保存せず、Markdown だけ保存する場合:

```bash
node workflow/scripts/save_content.js --no-images
```

既存 Markdown を上書きして再作成する場合:

```bash
node workflow/scripts/save_content.js --all --overwrite
```

30日以上古い Markdown だけ再作成する場合:

```bash
node workflow/scripts/save_content.js --all --refresh-days 30
```

## ルートの静的サイトを再生成する

`content/index.md` と `content/domain-glossary.md` を元に、`dist/index.html` と `dist/domain-glossary.html` を再生成できます。

```bash
npm run build:root
```

`content/tag-guides/*.md` を元に、`dist/tag-guides/*.html` を再生成できます。

```bash
npm run build:tag-guides
```

このコマンドは、Markdown をそのまま HTML に変換します。semantic fence の整形をしたい場合は `npm run fix:tag-guides`、整形が必要か確認したい場合は `npm run check:tag-guides` を使ってください。`tone-*` は色のヒント、`.process` や `.definition` などの suffix は構造のヒントとして扱われます。

## Source Safety

`npm run build` と `npm run verify` は、`content/` 配下の原本 Markdown を変更しません。
semantic fence の整形が必要か確認する場合は `npm run check:tag-guides` を使い、原本を更新したい場合だけ `npm run fix:tag-guides` を使ってください。

## 公開用資産を `dist/` にまとめる

HTML の公開に必要な CSS / JS を `dist/site/` にまとめたい場合は次を実行します。

```bash
npm run build:assets
```

このコマンドは、`dist/site/` に CSS / JS をコピーします。`dist/` に source Markdown は置きません。生成物は Git にコミットしません。

## 保存済み SingleFile を一覧表示する

`npm run save:singlefile` を実行すると、保存処理のあとに次の一覧ページが生成されます。

```text
archive/singlefile/index.html
```

ブラウザでこのファイルを開くと、ローカルに保存済みの SingleFile HTML へリンクできます。

一覧ページだけ作り直したい場合:

```bash
node workflow/scripts/build_singlefile_index.js
```

## 再生成の入口

`workflow/scripts/` にあるスクリプトが、記事保存、一覧生成、タグガイド生成、公開用資産のパッケージングの中心です。

- `workflow/scripts/save_singlefile.js`
- `workflow/scripts/save_content.js`
- `workflow/scripts/build_singlefile_index.js`
- `workflow/scripts/build_root_pages.js`
- `workflow/scripts/annotate_tag_guides_fences.js`
- `workflow/scripts/build_tag_guides_html.js`
- `workflow/scripts/package_dist_assets.js`
- `scripts/clean-dist.mjs`
