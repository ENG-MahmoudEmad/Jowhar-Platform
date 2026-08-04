// src/lib/supabase/admin.ts
// عميل بصلاحيات service_role — يتجاوز RLS بالكامل.
// يُستخدم فقط داخل Server Actions/Route Handlers محمية أصلاً بفحص is_chief/access_role،
// ولأشياء لا يقدر عليها الـ anon client مثل قراءة auth.users (الإيميل).
// ⚠️ لا يُستورد أبدًا داخل أي كومبوننت أو كود يصل للمتصفح.
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}