// lib/supabase/client.ts
// يُستخدم فقط جوا مكونات فيها "use client" (زي SignUpPage و LoginPage)

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}