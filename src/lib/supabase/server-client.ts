import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Supabaseクライアント（サーバー専用・anon key）。
//
// 構成: Browser -> Server Component -> Repository -> ここ -> Supabase
// ブラウザから直接呼ばれることを防ぐため、モジュール読み込み時にガードする。
// 使用キーは anon key のみ。GET系（読み取り専用）のRepositoryはすべて
// このクライアントを使う。
// 環境変数名は NEXT_PUBLIC_ を付けず、クライアントバンドルに混入しないようにする。
//
// service_role key を使う書き込み専用クライアントは admin-client.ts に分離
// している（RLSを完全にバイパスするため、意図しない誤用を避けるためにも
// このファイルとは物理的に別ファイルにしてある）。

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/supabase/server-client.ts はサーバー専用です。ブラウザ（Client Component）から import しないでください。"
  );
}

let cachedClient: SupabaseClient | undefined;

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_ANON_KEY が .env.local に設定されていません。"
    );
  }

  cachedClient = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  return cachedClient;
}
