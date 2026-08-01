'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function BackToLoginButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleClick = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <button
      onClick={handleClick}
      className="inline-block mt-8 text-sm font-semibold"
      style={{ color: '#5ea8a4' }}
    >
      العودة لتسجيل الدخول
    </button>
  );
}