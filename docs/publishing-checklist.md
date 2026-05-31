# Publishing Checklist

## Build

- [ ] `npm run build` または `npm run build:pages` が成功する
- [ ] `npm run verify` が成功する
- [ ] `npm run verify:pages` が成功する

## GitHub Pages

- [ ] GitHub Pages の Source が `Deploy from a branch` になっている
- [ ] Branch が `main` になっている
- [ ] Folder が `/docs` になっている
- [ ] 公開URLでトップページが表示できる

## Content

- [ ] トップページで「何のサイトか」が分かる
- [ ] 対象読者が明記されている
- [ ] 対象外が明記されている
- [ ] 対象時点が明記されている
- [ ] 目次から各章へ移動できる
- [ ] 各章に「この章で見直せること」がある
- [ ] 各章からトップページへ戻れる
- [ ] 最新仕様・料金・制限・推奨事項は公式ドキュメント確認を促している

## Links

- [ ] トップページから各章へのリンクが壊れていない
- [ ] 各章から用語集へのリンクが壊れていない
- [ ] CSS / JS が読み込めている
- [ ] 外部リンクが意図した公式ドキュメントを指している

## Readability

- [ ] スマホ幅で読みにくくない
- [ ] 目次が長すぎない
- [ ] 用語リンクが過剰でない
- [ ] 初見の読者が30秒以内に読む章を選べる
