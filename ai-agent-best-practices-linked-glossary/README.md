# AI Agent Best Practices Linked Glossary

このフォルダは、AIエージェント関連のベストプラクティス記事をタグ別に統合したMarkdown記事群です。各記事では、要約本文のドメイン用語を `domain-glossary.md` の優先表記に寄せ、主要な用語を用語集の該当行へリンクしています。

## フォルダ構成

```text
ai-agent-best-practices-linked-glossary/
├── README.md
├── index.html
├── style.css
├── serve.sh
├── articles.csv
├── domain-glossary.md
├── domain-glossary.html
└── tag-guides/
    ├── 01-agent-design.md
    ├── 01-agent-design.html
    ├── 02-workflow-design.md
    ├── 02-workflow-design.html
    ├── ...
    └── 10-governance.html
```

## ローカルで読む方法

ターミナルでこのフォルダに移動し、次のどちらかを実行してください。

```bash
./serve.sh
```

または、以下でも起動できます。

```bash
python3 -m http.server 8000
```

起動後、ブラウザで次を開きます。

```text
http://localhost:8000/
```

`index.html` から、各Markdown記事の読みやすいHTML版とMarkdown原文へ移動できます。

## 生成・修正の基準

### 1. ドメイン用語の基準

用語の統一には `domain-glossary.md` を使いました。用語集は表形式を維持しつつ、各行の `English` セルにHTMLアンカーを追加しています。

例：

```md
| <a id="agent"></a>Agent | エージェント | ... |
```

これにより、記事本文から次のように用語集の特定行へリンクできます。

```md
[エージェント](../domain-glossary.md#agent)
[ツール利用](../domain-glossary.md#tool-use)
[コンテキスト設計](../domain-glossary.md#context-engineering)
```

HTML版では、読みやすさのためリンク先を `.html` に変換しています。

### 2. どこにドメイン用語を適用したか

ドメイン用語の統一は、各記事の本文、特に要約・解説部分に適用しました。

一方で、以下は原則として変更していません。

- 記事のH1タイトル
- `対象記事` に載せている外部記事タイトル
- 外部記事URL
- 出典名

これは、外部記事の正式タイトルを変えてしまうと、出典確認や検索時に混乱しやすいためです。

### 3. 対象記事の扱い

各記事の `対象記事` セクションでは、添付の `articles.csv` にある記事タイトルとURLを基準にしました。記事タイトルはドメイン用語に合わせて書き換えず、元タイトルのままMarkdownリンクにしています。

例：

```md
- Google Cloud — [Choose a design pattern for your agentic AI system](https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system)
```

### 4. リンク化の基準

用語リンクは、読みやすさを優先して、主に以下に付けています。

- 各記事内での重要語の初出
- その章の理解に必要な中核用語
- 表記揺れが起きやすい語

すべての出現箇所をリンク化すると本文が読みにくくなるため、過剰なリンク化は避けています。

### 5. 表記統一の例

代表的には、次のように寄せています。

| 変更前の例 | 優先表記 |
|---|---|
| AIエージェント / agent / AI agent | エージェント |
| agentic system / AIシステム | エージェントシステム |
| tool calling / function callingとの混同 | 文脈に応じてツール利用・ツール呼び出し・Function Calling |
| human-in-the-loop / 人間確認 | 人間レビュー |
| evals / テスト | 評価、評価ケース、評価スイート |
| prompt engineering / 文脈設計 | コンテキスト設計 |
| guardrails | ガードレール |

### 6. HTML版について

Markdown原文は `tag-guides/*.md` として残しつつ、ブラウザで読みやすいように `pandoc` でHTML版も生成しています。

- Markdown原文: 編集・Git管理向け
- HTML版: ローカルブラウザで読むための閲覧向け

HTML版では、同じ内容を記事風に読みやすく表示するため、`style.css` を共通スタイルとして使っています。
