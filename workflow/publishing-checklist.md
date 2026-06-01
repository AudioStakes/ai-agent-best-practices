# Publishing Checklist

## Build

- [ ] `npm run build` が成功する
- [ ] 必要に応じて `npm run build:pages` でも公開用 HTML を再生成できる
- [ ] `npm run verify` が成功する
- [ ] `npm run verify:pages` が成功する

## GitHub Pages

- [ ] GitHub Pages は GitHub Actions で build した artifact を公開する運用になっている
- [ ] もし `Deploy from a branch` を使うなら、生成 HTML をコミットする必要があり、この方針とは両立しない
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
- [ ] トップページの CSS が反映されている
- [ ] `site/styles/style.css` と `site/scripts/term-popup.js` の相対パスが GitHub Pages 配下でも解決される
- [ ] 用語ポップアップ、または用語リンクの挙動が壊れていない
- [ ] `dist/index.html` を build 後に直接開いた場合と GitHub Pages 経由で開いた場合のリンク先が一致している
- [ ] `dist/index.md` や `dist/domain-glossary.md` は build output であり、原本ではない
- [ ] 外部リンクが意図した公式ドキュメントを指している

## Readability

- [ ] スマホ幅で読みにくくない
- [ ] 目次・カード・チェックリストがスマホ幅で崩れていない
- [ ] 各章の先頭に戻るリンクが分かりやすい
- [ ] 初見の読者が30秒以内に読む章を選べる
