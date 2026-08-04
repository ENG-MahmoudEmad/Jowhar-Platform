// lib/supabase/client.ts
// يُستخدم فقط جوا مكونات فيها "use client" (زي SignUpPage و LoginPage)

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}