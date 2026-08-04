// lib/supabase/server.ts
// يُستخدم جوا Server Components أو Route Handlers أو Server Actions
// (أي ملف ما فيه "use client" بأعلاه)

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './database.types';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // بيصير هيك لو انحاول تعديل cookies من Server Component
            // مش مشكلة طالما عندنا middleware بيحدّث الـ session
          }
        },
      },
    }
  );
}