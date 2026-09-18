import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Supabaseクライアント（サーバー専用・service_role key）。
//
// 用途: SET画面「保存する」機能（analysis_set作成RPC呼び出し）専用。
// service_role key は RLS を完全にバイパスするため、このファイル以外では
// 絶対に使わない（GET系Repositoryは引き続き server-client.ts の anon key
// を使う。混同を避けるため意図的に別ファイルにしている）。
//
// 呼び出せる範囲はさらに、呼び出し先のPostgreSQL関数(create_analysis_set)側
// でも service_role にしか EXECUTE 権限を与えないことで二重に絞っている
// （migration: 20260918060000_create_analysis_set_rpc.sql 参照）。
//
// ブラウザから直接呼ばれることを防ぐため、モジュール読み込み時にガードする。
// Client Componentからこのファイルをimportしないこと
// （Server Action(actions.ts) -> ここ、という経路のみで使う）。
// 環境変数名は NEXT_PUBLIC_ を付けず、クライアントバンドルに混入しないようにする。

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/supabase/admin-client.ts はサーバー専用です。ブラウザ（Client Component）から import しないでください。"
  );
}

let cachedClient: SupabaseClient | undefined;

export function getSupabaseAdminClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が .env.local に設定されていません。"
    );
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return cachedClient;
}
