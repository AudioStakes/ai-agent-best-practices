# 11. MarkdownコードブロックHTMLデザイン見本

このページは、Markdown だけを編集して再生成できる見本です。  
`annotate_tag_guides_fences.ts` でマーカーを整え、`build_tag_guides_html.ts` で HTML に変換すると、どの文章にどのスタイルが当たるかをそのまま確認できます。

## 使い分けの早見表

| Markdown の目印 | 変換後の HTML | 見た目 | 向いている文章 |
| --- | --- | --- | --- |
| `tone-good.guideline` | `ul.guideline-list` | 緑のチェック付きリスト | PoC、デモ、成功条件、やること |
| `tone-bad.risk` | `ul.risk-box` | オレンジの警告リスト | 本番、失敗条件、制御したい項目 |
| `tone-neutral.takeaway` | `div.takeaway-box` | ひと言の結論ボックス | 一番大事な結論 |
| `tone-neutral.process` | `ol.process-steps` | 連番の手順 | 順番が重要な作業 |
| `tone-neutral.checklist` | `ul.checklist` | チェックボックスの確認項目 | レビュー、確認、抜け漏れ防止 |
| `tone-neutral.question-checklist` | `ul.checklist.question-checklist` | 質問形式のチェックリスト | 何を確認するかを聞きたいとき |
| `tone-neutral.risk-ladder` | `div.risk-ladder` | 低/中/高の段階表現 | リスクの強さを段階で見せたいとき |
| `markdown.definition` | `div.definition-box` | 用語と説明の定義枠 | 定義、見出し付きの説明 |
| `tone-neutral.structured` | `div.structured-list` | キーと値の一覧 | 項目と説明を対にしたいとき |
| `json.code-example` | `div.code-example-box` | ラベル付きコード例 | 設定例、データ例、出力例 |
| `tone-good` / `tone-bad` / `tone-neutral` | `div.term-chip-list[data-tone]` | 短いチップ列 | 短い語句だけを軽く並べたいとき |

> 補足: このサイトの通常ビルドでは、`tone-*` の裸の fence は、内容を見て `guideline` / `risk` / `takeaway` などへ昇格します。  
> そのため、実運用では「どの見た目にしたいか」だけでなく、「どの意味を持たせたいか」まで含めてタグを付けます。

## PoCでは、

「1回成功すれば価値が伝わる」文章は、`tone-good.guideline` が合います。  
成功条件やデモの見せ方を、チェック付きの緑系ブロックで見せたいときに使います。

```tone-good.guideline
- 1回成功する
- デモで動く
- 代表例で便利に見える
- 人間が横で見ている
```

この形は、PoC の説明や、デモで先に見せたい項目に向いています。  
「やること」を軽く、でも肯定的に並べたいときの定番です。

## でも本番では、

「確認すべきこと」「制御したいこと」「失敗したくないこと」は、`tone-bad.risk` に寄せます。  
これは警告色ですが、単なる失敗談ではなく、運用で押さえるべき条件を前に出すための見せ方です。

```tone-bad.risk
- 失敗時に検知できる
- 何度実行しても安定する
- コストが予測できる
- 権限が制御されている
- ログが残る
- 人間確認ポイントがある
- 改善前後を比較できる
```

この見せ方は、本番運用、権限管理、監視、コスト確認のような内容と相性がよいです。

## 共通する大事な点はこれです。

一番大事な結論は、`tone-neutral.takeaway` で一文にまとめます。  
これは「長い説明を読んだあとに、結局何を覚えればよいか」を見せるための箱です。

```tone-neutral.takeaway
最終結果だけでなく、途中で何が起きたかを見る
```

結論、指針、要点の見出しの直後に置くと、読み手の視線をすっと揃えられます。

## 必要なのは、

順番が大事なものは、`tone-neutral.process` にします。  
これは手順、実行順、レビューの流れのように、「並び順が意味を持つ」内容に向いています。

```tone-neutral.process
1. 調査する
2. 修正する
3. 検証する
```

複数のステップを順番に見せたいときは、これがいちばん読みやすいです。

## チェックしたいとき

確認項目は `tone-neutral.checklist` にします。  
質問形なら `tone-neutral.question-checklist`、確認の列挙なら `tone-neutral.checklist` が分かりやすいです。

```tone-neutral.checklist
- 誰が監視するか
- 失敗時に誰へ渡すか
- どの指標を見るか
- いつ評価を回すか
- どのログを保存するか
- どの権限を許すか
- どの変更をレビューするか
```

```tone-neutral.question-checklist
誰が監視するか?
失敗時に誰へ渡すか?
どの指標を見るか?
いつ評価を回すか?
どのログを保存するか?
どの権限を許すか?
どの変更をレビューするか?
```

同じチェックボックス風の見た目でも、  
「確認事項の列挙」なのか「質問として洗い出す」のかでタグを分けると、後で読み返しやすくなります。

## リスクを段階で見せる

`tone-neutral.risk-ladder` は、低リスク・中リスク・高リスクのように段階で見せたいときに使います。  
単純な注意書きよりも、「どこから危険度が上がるか」を整理したいときに向いています。

```tone-neutral.risk-ladder
低リスク: ファイルを読む
中リスク: ローカルファイルを編集する
高リスク: 削除する
```

段階ごとに、どこで人間の確認が必要になるかを並べたいときに便利です。

## 定義をはっきり見せる

`markdown.definition` は、用語や見出しと説明を対にしたいときのスタイルです。  
ここは「文章を読ませる」より「意味を整理する」ことに向いています。

```markdown.definition
## Goal
AI に任せたときでも、期待した結果にたどり着ける状態

## Constraints
権限、ログ、コスト、再実行性の制約
```

見出しごとの説明が必要なとき、あるいは用語集の補助として使うと分かりやすくなります。

## 項目を並べる

キーと値を並べたいときは、`tone-neutral.structured` が便利です。  
箇条書きよりも「項目名と説明」をはっきり見せたいときに向いています。

```tone-neutral.structured
目標: 1回成功させる
確認: デモで動く
監視: 人間が横で見る
```

短い属性の一覧や、要素ごとの役割を見せるときに使うと、読み手が流し読みしやすくなります。

## コード例

`json.code-example` や `text.code-example` は、コード断片や設定例をそのまま見せたいときに使います。  
見出し付きのコードブロックとして出るので、本文と区別がつきやすくなります。

```json.code-example
{
  "status": "ok",
  "next": "verify"
}
```

コード例は、設定値、API の返却例、検証用の最小サンプルの見せ方に向いています。

## まとめ

- `guideline` は、やることや成功条件を見せる
- `risk` は、注意点や本番で確認すべきことを見せる
- `takeaway` は、結論を一文で見せる
- `process` は、順番を見せる
- `checklist` は、確認項目を見せる
- `risk-ladder` は、危険度の段階を見せる
- `definition` は、定義や説明を見せる
- `structured` は、項目名と値を見せる
- `code-example` は、コードや設定例を見せる

Markdown だけを直せば、この見本は何度でも同じ形で再生成できます。
