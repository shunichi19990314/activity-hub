# Activity Hub ⚡

いろいろなサイトの最近のアクティビティを 1 つのダッシュボードにまとめて表示するウェブアプリです。
**npm install 不要** — Node.js 18+ だけあれば動きます(外部ライブラリ ゼロ)。

## 対応サービス

| サービス | 内容 | APIキー |
|---|---|---|
| **GitHub** | ユーザーの公開アクティビティ(プッシュ・スター・Issue・PR・リリース等) | 任意(なしでも動作。60回/時 → 5,000回/時に緩和) |
| **Hacker News** | Top / Best / New 記事 | 不要 |
| **Reddit** | サブレディットの新着投稿 | **必要**(無料・`client_credentials`) |
| **RSS / Atom** | 任意のブログ・ニュースサイト | 不要 |
| **YouTube** | チャンネルの最近の動画 | 任意(なしは RSS 経由、あれば Data API v3) |
| **X (Twitter)** | アカウントの最近の投稿 | **必要**(API v2 Bearer Token) |
| **Google カレンダー** | 過去7日〜未来21日の予定 | **必要**(サービスアカウント or OAuth) |
| **崩壊:スターレイル** | 開拓力・日課・週間・派遣(リアルタイムノート)+ 公式ニュース + デイリーサインイン自動化(任意) | **Cookie 必要**(ニュースは不要)・非公式API |

## クイックスタート

```bash
cd activity-hub
node server.js
# → http://localhost:3000 を開く
```

これだけでサーバーが起動します。**初回はまっさらなウェルカム画面**が表示されます(プリセットは入っていません)。
サイトを開いた後に、右上の **設定** から追跡したいアカウントやフィードを追加してください
(GitHub ユーザー名・サブreddit・RSS URL・YouTube チャンネル・X アカウント・カレンダー ID)。
API キーも同じ設定画面から入力でき、**保存すると再起動なしですぐ反映**されます。

> ✨ まずは動作を見たいだけなら、ウェルカム画面の「**サンプルで試す**」ボタンで
> キー不要のソース(GitHub: torvalds / Hacker News / NHK NEWS / YouTube: @NHK)をワンクリック追加できます。

## APIキーの設定

**3つの方法**があり、優先順位は ① > ② です(③は②のクラウド版)。

### ① 設定画面から入力(一番簡単・再起動不要)

ダッシュボード右上の **設定** を開き、各サービスの「🔑 APIキー」欄に貼り付けて
**保存して再読み込み** を押すだけ。サーバーの `secrets.json`(アクセス権 600)に保存され、
**その場で反映**されます。値がブラウザに返されることはありません(設定済みフラグのみ)。

### ② `.env` ファイル(ローカル運用)

1. `.env` ファイルを開く(`.env.example` がテンプレート)
2. 使いたいサービスの行に値を書く
3. `node server.js` を再起動

### ③ Railway の Variables(クラウド運用)

サービスの **Variables** タブに `.env` と同じ名前で登録します(再デプロイで自動反映)。

> 🔒 **公開 URL で運用する場合**: 設定画面(=キー保存 API)も URL を知る人が触れるため、
> `.env` / Variables で `BASIC_AUTH_USER` と `BASIC_AUTH_PASS` を設定して
> Basic 認証を有効にすることを推奨します。

未取得のカードには「🔑 要設定」とヒントが表示されます。

### 各キーの入手方法(要約)

- **GitHub**: https://github.com/settings/tokens → トークン生成(権限スコープ不要)
- **Reddit**: https://www.reddit.com/prefs/apps → *create an app* → 種類 **script**。
  アプリ名直下の文字列が `REDDIT_CLIENT_ID`、`secret` が `REDDIT_CLIENT_SECRET`
- **YouTube**: https://console.cloud.google.com → 「YouTube Data API v3」有効化 → 認証情報 → APIキー
- **X (Twitter)**: https://developer.x.com → Projects & Apps → App の *Keys and tokens* → **Bearer Token**
  (Free プランは読み取り制限が厳しいため表示件数が少ない/エラーになることがあります)
- **崩壊:スターレイル**: HoYoLAB の Cookie(`ltoken_v2` + `ltmid_v2`)— 詳細は下記「崩壊:スターレイル連携」参照
- **Google カレンダー**:
  - 方法A(推奨): サービスアカウント JSON を `activity-hub/service-account.json` として置き、
    `.env` の `GOOGLE_APPLICATION_CREDENTIALS=service-account.json` を設定。
    表示したいカレンダーをサービスアカウントのメールに「予定の表示」権限で共有する。
  - 方法B: OAuth(デスクトップアプリ)で `calendar.readonly` のリフレッシュトークンを取得し、
    `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` を設定。

## 機能

- **カード表示 / タイムライン表示** — チップで切り替え。「すべて」を時系列順にまとめたタイムラインも
- **サービス別フィルター** — GitHub だけ、HN だけ、などをワンクリックで
- **設定画面** — 追跡するユーザー・サブreddit・RSS URL・チャンネル・アカウント・カレンダーを UI から追加/削除(`config.json` に保存)
- **自動更新**(5分ごと)+ サーバー側 5 分キャッシュでレート制限に配慮
- **ソース単位の再読み込みボタン**・エラー時の再試行
- **ダーク/ライトテーマ**(ブラウザに記憶)、日本語 UI、レスポンシブ
- **デモモード** — サーバー未起動時に `public/index.html` を直接開いても、サンプルデータでレイアウトを確認できます
- **デプロイ対応** — Dockerfile / railway.json / ヘルスチェック(`/api/health`)/ Volume による設定永続化(`DATA_DIR`)/ オプションの Basic 認証

## 崩壊:スターレイル連携(HoYoLAB・非公式API)

**表示されるもの**: ⚡開拓力(現在値/上限/満タンまでの時間・予約開拓力)/ 📋日課(デイリー訓練)/ 🌌模擬宇宙(週間)/ 🗓週間割引 / 🚀派遣(残り時間・完了通知)/ 📰公式ニュース(お知らせ・イベント — **Cookie 不要**)/ 🎁デイリーサインイン自動化(オプション)

### 設定手順(国際版 HoYoLAB)

1. ブラウザで https://www.hoyolab.com にログイン
2. `F12`(開発者ツール)→ **Application** → **Cookies** → `https://www.hoyolab.com`
3. **`ltoken_v2`** と **`ltmid_v2`** の値をコピーし、
   `ltoken_v2=値; ltmid_v2=値` の形で本アプリの設定画面(崩壊:スターレイル → HOYOLAB_COOKIE)に貼り付け
4. サーバー(アジア/北米/欧州/TW・HK・MO)を選択。**UID は空欄で OK**(Cookie から自動検出)
5. 保存 → カードに表示されます

### 注意

- **非公式 API** です(HoYoLAB 内部 API のコミュニティ準拠実装。DS 署名をサーバー側で生成)。仕様変更で動かなくなることがあります
- HoYoLAB 側の **プライバシー設定「リアルタイムデータの表示(Show real-time data)」が ON** でないと取得できません(retcode 10102)
- Cookie はパスワード同然です。**サーバー側(secrets.json・権限600 / .env)にのみ保存**され、ブラウザには設定済みフラグしか返りません。パスワード変更・ログアウトで無効化された場合は貼り直してください(retcode 10001)
- 中国版(米遊社)はエンドポイント・認証が異なるため未対応です(国際版のみ)
- **サインイン自動化は「書き込み」操作**です。コミュニティで広く使われていますが非公式であり、有効化は自己責任でお願いします(1時間クールダウン付きで連打はしません)
- ポーリングは本アプリのキャッシュ(5分)経由のみ。短時間の連打は retcode 10104(アクセス頻度制限)の原因になります



## Railway にデプロイする

### 方法A: GitHub 経由(ダッシュボード操作)

1. `activity-hub` フォルダを GitHub リポジトリに push
   (`.env` は `.gitignore` 済みなので**キーはリポジトリに含まれません**)
2. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → リポジトリを選択
   - `Dockerfile` と `railway.json` が自動検出され、ヘルスチェック付きでビルドされます
3. サービスの **Variables** タブで、`.env.example` と同じ名前で環境変数を設定
   (例: `GITHUB_TOKEN`、`X_BEARER_TOKEN`、`REDDIT_CLIENT_ID` …)
   - ⚠️ `PORT` は Railway が自動注入するので**設定しない**
4. **Settings → Networking → Generate Domain** で公開 URL を発行 → 完了 🎉

### 方法B: Railway CLI

```bash
npm i -g @railway/cli
cd activity-hub
railway login
railway init                    # プロジェクト作成(既存に接続も可)
railway up                      # デプロイ(.gitignore に従い .env はアップロードされません)
railway domain                  # 公開ドメインを発行
railway variables set GITHUB_TOKEN=ghp_xxx X_BEARER_TOKEN=xxx   # キーを登録
railway logs                    # ログ確認
```

### 設定の永続化(Volume・推奨)

設定画面からの変更は `config.json` に保存されますが、コンテナのファイルは**再デプロイでリセット**されます。
維持するには:

1. サービス → **Volume** タブ → Volume を作成しマウントパスを `/data` に
2. **Variables** に `DATA_DIR=/data` を追加
3. 再デプロイ

初回はリポジトリ同梱の `config.json` が `/data` にシードされます。
Volume なしでも動作はしますが、設定画面での変更は再デプロイごとに失われます
(リポジトリの `config.json` を編集して push する運用でも OK)。

### 公開 URL をパスワード保護する(任意)

Variables に `BASIC_AUTH_USER` と `BASIC_AUTH_PASS` の両方を設定すると、
サイト全体が Basic 認証で保護されます(`/api/health` のみ除外 = ヘルスチェック用)。

### Railway デプロイ時の注意

- **GitHub**: 未認証 API は IP あたり 60回/時。クラウドの送信元 IP は制限に当たりやすいので
  **`GITHUB_TOKEN` の設定を強く推奨**します
- **Reddit**: データセンター IP からの API アクセスが Reddit 側で拒否されることがあります(403)。
  その場合は Reddit のカードだけエラー表示になります
- **Google カレンダー(サービスアカウント)**: JSON キーの中身を Railway の Variables に置く場合は
  `GOOGLE_APPLICATION_CREDENTIALS` の代わりにファイルマウントが必要になるため、
  **OAuth リフレッシュトークン方式(方法B)が手軽**です

## ファイル構成

```
activity-hub/
├── server.js        # ゼロ依存 Node サーバー(API集約・キャッシュ・認証情報管理)
├── config.json      # 追跡ソース設定(設定画面から編集される/初期値のシード)
├── secrets.json     # 設定画面から保存したAPIキー(自動生成・gitignore済み・600)
├── package.json     # npm start エンジン定義(依存パッケージなし)
├── Dockerfile       # Railway / コンテナ用イメージ定義
├── railway.json     # Railway デプロイ設定(ヘルスチェック等)
├── .dockerignore
├── .env             # APIキー(各自で記入。リポジトリ/イメージに含めないこと)
├── .env.example     # キーのテンプレート+入手方法コメント
├── README.md
└── public/
    ├── index.html
    ├── style.css
    ├── app.js
    └── favicon.svg
```

## API(参考)

- `GET /api/health` — ヘルスチェック(Railway 用・認証不要)
- `GET /api/state` — 現在の設定とキー設定状況(値は含まずフラグのみ)
- `GET /api/feed/all?force=1` — 全ソースのフィード
- `GET /api/feed/{github|hn|reddit|rss|youtube|x|gcal|hkrpg|hkrpgnews}?...&force=1` — 個別ソース
- `POST /api/config` — ソース設定の保存
- `POST /api/secrets` — APIキーの保存/削除(`{ "X_BEARER_TOKEN": "値" }` / 削除は `null`。`secrets.json` に 600 で保存し即反映)
- RSS エンドポイントは `config.json` に登録済みの URL のみ取得します(オープンプロキシ防止)

## トラブルシュート

- **GitHub がエラー**: 未認証だと 60回/時の制限。`GITHUB_TOKEN` を設定してください
- **Reddit が 403/認証エラー**: `client_credentials` 用の id/secret か確認。アプリ作成直後は数分待つこと
- **YouTube が取得できない**: 環境により RSS がブロックされることがあります。`YOUTUBE_API_KEY` を設定すると Data API 経由になります
- **ポート変更**: `.env` の `PORT=xxxx`
