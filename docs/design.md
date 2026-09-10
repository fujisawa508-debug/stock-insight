# WEBアプリ(投資分析判断) 実装設計書（4カテゴリ完全版）

## スライド 1

- 株式投資判断支援 Webアプリ
- 実装設計書｜4カテゴリ完全版 v2
- 日本株 × テーマ分析 × 保存 × 振り返り
- Claude Codeで実装を進めるために、画面・構成・DB・API・処理フローを1つに集約
- THEME
- STOCK
- SET
- REVIEW
- テーマ
- 銘柄分析
- 分析セット
- 振り返り
- MVP：分析・保存・比較
- AI：整理・説明役
- 分析時点データは上書きしない
- 1
- 1

## スライド 2

- 前回までの合意 / 今回まとめた設計
- 要件は固まっていた一方、実装に必要な設計を1冊に集約
- 前回までに合意
- 今回の補完
- プロダクト / MVP
- 実装に必要な設計
- • 日本株を対象に、テーマから5〜10銘柄を比較
- • HOME → THEME → STOCK → SET → REVIEW の流れ
- • AIは「買う/売る」の判断主体ではなく、注目理由やリスクの整理役
- • 分析時点の株価・指標・AI分析・情報源を保存
- • 後から現在値と比較し、当時の判断材料を振り返る
- • リアルタイム性より信頼性・履歴・低コストを優先
- • Next.js + TypeScript を中心としたアプリ構成
- • フロント / API / Service / Repository / Provider の責務分離
- • Supabase(PostgreSQL)を想定したDB構造
- • J-Quants / EDINET / ニュース / AIを差し替え可能な外部連携層
- • 固定スナップショットと最新データ比較の保存ルール
- • テスト・エラー処理・秘密情報管理・実装順序
- 2
- 2

## スライド 3

- 設計を4カテゴリで整理する
- 実装設計書 v1 の内容を落とさず、学習・レビューしやすい4章構成へ再配置
- 画面・UI設計
- データ・DB設計
- 01
- 02
- ユーザーが何を見るか / どう移動するか
- 何を保存し、何を履歴として固定するか
- 5画面・URL・画面責務
- DB構造・Snapshot・保存ルール
- 処理・API設計
- システム・非機能設計
- 03
- 04
- 操作から保存・比較まで何が起きるか
- アプリ全体をどう安全に成立させるか
- 処理フロー・API・Service・Provider
- 構成・技術・ディレクトリ・テスト・実装順
- 見方：実装中に「今どの設計を触っているか」を ①画面 ②データ ③処理 ④システム に戻して確認する。
- 3

## スライド 4

- 網羅性マップ｜実装設計書 v1 → 4カテゴリ完全版
- 元資料16枚の内容をすべて残し、カテゴリ別に並べ替えている
- 1. 表紙 / 2. 前回までの合意・今回補完
- 全体前提として冒頭に保持
- 共通
- 4. 画面設計 / ルーティング
- 5画面・URL・責務をそのまま保持
- ① 画面・UI
- 8. DB設計 / 9. 保存ルール
- テーブル構造・Snapshot固定ルールを保持
- ② データ・DB
- 5. 主要処理フロー / 10. API・Service / 11. 外部Provider
- ユーザー操作→取得→AI→保存→比較まで保持
- ③ 処理・API
- 3. 全体構成 / 6. 技術 / 7. ディレクトリ / 12. セキュリティ / 13. テスト / 14. Claude Code / 15. 実装順 / 16. 完成条件
- 実装基盤・品質・開発ルールまで保持
- ④ システム・非機能
- 結論：要約版ではなく「元の16枚をすべて残した上で、4カテゴリの章立てを追加」した完全版。
- 4

## スライド 5

- 01
- 画面・UI設計
- ユーザーは何を見て、どの順番でアプリを使うか？
- HOME → THEME → STOCK → SET → REVIEW の5画面
- 各画面のURLと責務を固定する
- 画面構造は変えても「分析→保存→振り返り」の流れは変えない
- この章の内容を実装できれば、該当カテゴリは「設計 → 実装」へ進める。
- 5

## スライド 6

- ① 画面・UI設計
- 画面設計 / ルーティング
- MVPの5画面をそのままURL構造に落とす
- HOME
- THEME
- STOCK
- SET
- REVIEW
- /
- /themes/[id]
- /stocks/[code]
- /analysis/[id]
- /review/[id]
- 登録テーマ一覧
最近の変化
- 5〜10銘柄
同じ軸で比較
- 注目理由
主要指標 / リスク
- 複数銘柄
分析時点を保存
- 分析時点 vs 現在
振り返り
- ※ URLは実装時に多少変更してもよい。ただし「5画面の責務」と「分析時点を保存してから振り返る流れ」は変えない。
- 6
- 4

## スライド 7

- 02
- データ・DB設計
- 何を保存し、どのデータを「当時の状態」として残すか？
- themes / stocks / analysis_sets / analysis_items / snapshots / sources
- 分析時点の株価・指標・AI分析・情報源をSnapshotとして固定
- 過去データを現在値で上書きしない
- この章の内容を実装できれば、該当カテゴリは「設計 → 実装」へ進める。
- 7

## スライド 8

- ② データ・DB設計
- DB設計｜MVPの最小構成
- 「テーマ」「分析セット」「固定Snapshot」を中心にする
- analysis_sets
- themes
- id
theme_id
title
analyzed_at
- stock_snapshots
- id
name
created_at
- analysis_item_id
price / PER / PBR
ROE / profit_yoy
captured_at
- theme_stocks
- theme_id
stock_code
reason
- analysis_items
- stocks
- set_id
stock_code
ai_summary
scores / risk
- sources
- code
name
industry
- analysis_item_id
source / url
published_at / fetched_at
- 重要：analysis_sets / items / snapshots は「当時の状態」を保持する履歴。最新値で上書きしない。
- 8
- 8

## スライド 9

- ② データ・DB設計
- 保存ルール｜分析時点と現在を混ぜない
- このアプリの価値を守るための最重要ルール
- 分析時点 Snapshot
- 現在データ
- 保存して固定するもの
- REVIEW時に再取得
- • 分析日時
- • 株価 / PER / PBR / ROE / 業績
- • AI要約・評価・リスク
- • 参照した情報源と公開日 / 取得日時
- • ユーザーの振り返りメモ
- • 現在株価
- • 現在の主要指標
- • 直近の決算 / 開示
- • 分析時点からの変化率
- • 当時の根拠が今どう見えるか
- 比較
- UPDATE禁止 → 新しい分析は新しいセットとして作成
- 比較表示に使うだけ。過去Snapshotは変更しない
- 9
- 9

## スライド 10

- 03
- 処理・API設計
- 画面操作の裏側で、取得・整理・保存・比較をどう流すか？
- テーマ選択 → データ取得 → 比較 → AI整理 → Snapshot保存
- Route Handlerは入口、Serviceに業務ロジックを置く
- 外部APIはProviderで吸収し、アプリ独自の型へ統一
- この章の内容を実装できれば、該当カテゴリは「設計 → 実装」へ進める。
- 10

## スライド 11

- ③ 処理・API設計
- 主要処理フロー｜分析セットを作る
- ユーザー操作 → データ取得 → AI整理 → 固定保存までを1本の流れで捉える
- 1
- 2
- 3
- 4
- 5
- 6
- テーマ選択
- 候補銘柄表示
- 銘柄を確認
- 5〜10銘柄を選択
- AI要約
- Snapshot保存
- HOME/THEME
- 株価・財務・開示取得
- 同じ評価軸で比較
- SET作成
- 注目理由 / リスク
- 株価・指標・AI・情報源
- 保存後の分析セットは不変。REVIEWでは「保存済みSnapshot」と「現在の取得データ」を比較する。
- 11
- 5

## スライド 12

- ③ 処理・API設計
- API / Service設計
- 画面は薄く、判断・保存ロジックはServiceに置く
- 画面からの操作
- Route Handler
- Service
- Repository / Provider
- テーマ一覧を見る
- GET /api/themes
- listThemes
- themeRepository
- テーマの銘柄を見る
- GET /api/themes/:id/stocks
- getThemeStocks
- marketDataProvider
- 銘柄詳細を見る
- GET /api/stocks/:code
- getStockDetail
- market + disclosure
- 分析セット保存
- POST /api/analysis
- createAnalysisSet
- DB + AI + sources
- 振り返り
- GET /api/review/:id
- buildReview
- snapshot + current
- 例：POST /api/analysis の中で「入力検証 → データ取得 → AI要約 → DB保存」を順番に制御する。
- 12
- 10

## スライド 13

- ③ 処理・API設計
- 外部連携設計｜Providerで差し替え可能にする
- 具体的なAPIが変わってもアプリ本体を書き直さない
- MarketDataProvider
- DisclosureProvider
- NewsProvider
- AiProvider
- 株価 / PER / PBR / ROE
- 決算 / 業績修正 / 開示
- 重要イベント / ニュース
- 要約 / リスク説明
- 接続候補
- 接続候補
- 接続候補
- 接続候補
- J-Quants等
- EDINET等
- MVPでは必要最小限
- Claude / OpenAI等を交換可能
- Providerの戻り値はアプリ独自の型に統一 → 外部サービス固有の形式を画面やDBに漏らさない。
- 13
- 11

## スライド 14

- 04
- システム・非機能設計
- アプリ全体をどう安全・保守可能・学習しやすく作るか？
- Next.js / TypeScript / Supabaseを中心とした構成
- UI・Service・Repository・Providerの責務分離
- 秘密情報・外部API障害・テスト・Claude Code運用ルール
- 途中でも毎回動く状態を維持する実装ロードマップ
- この章の内容を実装できれば、該当カテゴリは「設計 → 実装」へ進める。
- 14

## スライド 15

- ④ システム・非機能設計
- システム構成｜全体像
- 「画面」「業務ロジック」「保存」「外部データ」を分けて、後から差し替えやすくする
- APP
- LOGIC
- DATA
- FRONT
- Next.js App
- Service Layer
- Repository / Provider
- Browser / UI
- Route / Server処理
入力検証
画面とAPIの接点
- 分析セット保存
比較処理
AI要約の制御
- DBアクセス
外部API呼び出し
データ形式を統一
- 5画面を表示
ユーザー操作
結果の可視化
- Supabase
- 株価・財務
- 開示・ニュース
- AI API
- テーマ / 銘柄 / 履歴
- J-Quants候補
- EDINET等
- 要約・説明
- ポイント：画面から外部APIを直接呼ばない。Provider層で吸収することで、API変更時の影響を局所化する。
- 15
- 3

## スライド 16

- ④ システム・非機能設計
- 技術スタック｜MVP実装案
- 初心者でも追いやすく、Claude Codeで実装しやすい構成を優先
- Frontend
- Server
- Database
- Next.js / React
TypeScript
Tailwind CSS
- Next.js Server
Route Handlers
- Supabase
PostgreSQL
- 画面 / ルーティング / UI
- API入口 / 検証 / 認可
- テーマ / 銘柄 / 分析履歴
- External
- AI
- Deploy
- Provider Pattern
- AI Provider
- Vercel候補
- J-Quants / EDINET / News
- 要約 / リスク説明 / 比較補助
- MVP公開 / 環境変数管理
- 16
- 6

## スライド 17

- ④ システム・非機能設計
- ディレクトリ設計
- 「どこに何を書くか」を固定して、Claude Codeの変更範囲を読みやすくする
- UI
- src/
├─ app/                 # 画面とRoute Handler
│  ├─ page.tsx          # HOME
│  ├─ themes/[id]/
│  ├─ stocks/[code]/
│  ├─ analysis/[id]/
│  ├─ review/[id]/
│  └─ api/
├─ components/          # 再利用UI
├─ lib/
│  ├─ services/         # 業務ロジック
│  ├─ repositories/     # DBアクセス
│  ├─ providers/        # 外部API / AI
│  └─ validators/       # 入力検証
├─ types/               # 型定義
└─ tests/               # テスト
- app / components
- ユーザーから見える部分。最初に触る場所。
- LOGIC
- services
- 「分析セットを保存する」など、アプリ固有の処理。
- DATA
- repositories / providers
- DB・外部APIという“外の世界”との接点。
- 初心者がまず理解する順：
app → service → provider/repository
- 17
- 7

## スライド 18

- ④ システム・非機能設計
- エラー処理 / セキュリティ
- MVPでも「秘密情報」と「外部API障害」は最初から設計に入れる
- 秘密情報
- 外部API障害
- 入力 / データ品質
- • APIキーは .env.local / Vercel環境変数
- • ブラウザに秘密鍵を渡さない
- • Gitへ .env をコミットしない
- • 1つ失敗しても全画面を落とさない
- • 取得できない項目は「未取得」と表示
- • 保存済みSnapshotは常に閲覧可能
- • 銘柄コード・IDをサーバー側で検証
- • 情報源 / 公開日 / 取得日時を保持
- • AI出力も出典データと紐づける
- AIの回答は「参考情報」。売買判断そのものを自動化しない。
- 18
- 12

## スライド 19

- ④ システム・非機能設計
- テスト設計
- Claude Codeに「実装と同時にテスト」を書かせる
- 計算 / 変換 / 評価ロジック
- 例：変化率、指標整形、Providerのmapping
- Unit
- Service + DB / Provider
- 例：分析セットを保存できるか
- Integration
- 5画面の利用フロー
- 例：テーマ→銘柄→保存→振り返り
- E2E / Manual
- MVP完成条件＝要件定義の8項目を実際の画面操作で通せること。
- 19
- 13

## スライド 20

- ④ システム・非機能設計
- Claude Codeでの開発ルール
- 「速く作る」＋「何を作ったか説明できる」を両立
- 実装前に計画
- 目的 / 変更ファイル / データの流れを先に説明
- 01
- 1機能ずつ
- 巨大な一括変更を避け、レビュー可能な単位にする
- 02
- 既存設計を守る
- 変更が必要なら理由を先に説明。勝手に構造変更しない
- 03
- テストまで実装
- 正常系だけでなく、外部API失敗も確認
- 04
- 最後に解説
- 読むべきコード3か所と、次に変更する場所を説明
- 05
- 勉強の重点：全行を覚えるより「UI → API → Service → DB/外部API」の流れを説明できること。
- 20
- 14

## スライド 21

- ④ システム・非機能設計
- 実装順序｜Claude Codeで進めるロードマップ
- 途中段階でも毎回「動く状態」を維持する
- 0
- 1
- 2
- 3
- 4
- 5
- 6
- 7
- 骨組み
- 画面
- DB
- データ
- AI
- 保存
- 比較
- 仕上げ
- Next.js / routes / layout
- ダミーデータで5画面
- Supabase / schema / repository
- Market / Disclosure provider
- 要約 / リスク / 根拠
- Analysis + Snapshot
- Snapshot vs Current
- test / deploy / README
- 今日ここから
- UI確認
- 保存
- 実データ
- 整理
- 履歴固定
- REVIEW
- MVP完成
- 最初のClaude Codeタスク：プロジェクト構成を確認 → 5画面のルーティングと共通レイアウト → ダミー表示まで。外部API・DB・AIはまだ接続しない。
- 21
- 15

## スライド 22

- ④ システム・非機能設計
- MVP完成条件
- ここまで動けば、要件定義 → 設計 → 実装が一周する
- テーマを登録・一覧表示できる
- テーマから5〜10銘柄を確認できる
- ✓
- ✓
- 銘柄の基本分析を見られる
- 注目理由をAI要約できる
- ✓
- ✓
- 複数銘柄を分析セットとして保存できる
- 分析時点のデータを固定保存できる
- ✓
- ✓
- 過去分析を開ける
- 分析時点と現在を比較できる
- ✓
- ✓
- 次フェーズ：事後分析AI → 判断傾向の分析 → 判断支援。自動購入はMVP対象外。
- 22
- 16
