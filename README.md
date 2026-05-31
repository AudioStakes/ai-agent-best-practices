# AI Agent Best Practices Linked Glossary

このリポジトリのメインコンテンツは、ルート配下に置いた静的サイトです。AIエージェント関連のベストプラクティス記事をタグ別にまとめ、用語集へのリンクとポップアップを付けてローカル閲覧しやすくしています。

## 見る

```bash
./serve.sh
```

ブラウザで次を開きます。

```text
http://localhost:8000/
```

主な入口:

- [index.html](./index.html)
- [用語集](./domain-glossary.html)
- [README.html](./README.html)

## 構成

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
└── README.md
```

## 何が入っているか

- `tag-guides/`: タグ別の記事 HTML と Markdown
- `domain-glossary.md` / `domain-glossary.html`: 用語集の原本と閲覧版
- `tests/`: ローカル表示の UI 挙動を確認する Playwright テスト
- `style.css` / `term-popup.js`: 共通の見た目と用語ポップアップ

## 品質確認

このサイトに対する lint, format, test は一つのコマンドで実行できます。

```bash
npm run verify
```

## 再生成手順

記事の保存や抽出の手順は、別ディレクトリの [workflow/README.md](./workflow/README.md) にまとめています。
