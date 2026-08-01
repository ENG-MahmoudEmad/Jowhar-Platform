import React from 'react';
import { redirect } from 'next/navigation';
import { Hourglass } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export default async function PendingApprovalPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // مش مسجل دخول أصلاً -> رجّعه لصفحة الدخول
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .single();

  // لو صار الحساب active فعلاً (وافق الأدمن)، ما داعي يضل هون
  if (profile?.status === 'active') {
    redirect('/dashboard');
  }

  const isRejected = profile?.status === 'rejected';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-8 font-sans"
      style={{ background: '#0d1117', color: '#e6edf3' }}
    >
      <div className="max-w-sm text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 mx-auto"
          style={{
            background: isRejected
              ? 'linear-gradient(135deg,#dc2626 0%,#991b1b 100%)'
              : 'linear-gradient(135deg,#4e9996 0%,#3a7472 60%,#2d5c5a 100%)',
          }}
        >
          <Hourglass className="w-7 h-7 text-white" />
        </div>

        <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "'Georgia', serif" }}>
          {isRejected ? 'تم رفض طلب الانضمام' : 'بانتظار موافقة الإدارة'}
        </h2>

        <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>
          {isRejected
            ? 'نأسف، لم تتم الموافقة على طلبك حالياً. يمكنك التواصل مع الإدارة لمزيد من التفاصيل.'
            : 'تم إنشاء حسابك بنجاح، وهو الآن قيد المراجعة من قبل الإدارة. ستصلك رسالة على بريدك الإلكتروني فور الموافقة.'}
        </p>

        <a
          href="/login"
          className="inline-block mt-8 text-sm font-semibold"
          style={{ color: '#5ea8a4' }}
        >
          العودة لتسجيل الدخول
        </a>
      </div>
    </div>
  );
}