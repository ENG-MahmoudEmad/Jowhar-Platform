// src\app\(dashboard)\DashboardShell.tsx
// كل المنطق التفاعلي اللي كان بـ layout.tsx (drawer، RTL، إلخ).
// انفصل عن الـ layout لأن الأخير صار Server Component يجيب بيانات المستخدم.

"use client"

import { useEffect, useState } from 'react';
import { useLang } from '@/context/LangContext';
import { UserProvider, type CurrentUser } from '@/context/UserContext';
import Sidebar from '@/components/dashboard/Sidebar';
import Navbar from '@/components/dashboard/Navbar';
import Footer from '@/components/dashboard/Footer';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardShell({
  children,
  initialUser,
  initialPermissions,
}: {
  children: React.ReactNode;
  initialUser: CurrentUser | null;
  initialPermissions: string[];
}) {
  const { applyRTLToPage, lang, isRTL } = useLang();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    applyRTLToPage();
  }, [applyRTLToPage, lang]);

  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 1280) setDrawerOpen(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  return (
    /*
      UserProvider يلف كل الداشبورد: البيانات وصلت جاهزة من السيرفر (layout.tsx)
      فما في استعلام client-side ولا ومضة تحميل، وكل الكومبوننتات
      (Sidebar, Navbar, ...) بتقرأ منه بدل ما كل واحد يعمل استعلام لحاله.
    */
    <UserProvider initialUser={initialUser} initialPermissions={initialPermissions}>
      <div className="flex h-screen overflow-hidden dashboard-bg" style={{ background: 'var(--background)' }}>

        {/* ─── Desktop Sidebar ─── */}
        <div className="dashboard-bg-layer hidden xl:flex shrink-0">
          <Sidebar />
        </div>

        {/* ─── Mobile backdrop ─── */}
        <AnimatePresence>
          {drawerOpen && (
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="bg-black/60 backdrop-blur-sm xl:hidden"
              style={{ position: 'fixed', inset: 0, zIndex: 90 }}
              onClick={() => setDrawerOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* ─── Mobile drawer ─── */}
        <AnimatePresence>
          {drawerOpen && (
            <motion.div
              key="drawer"
              initial={{ x: isRTL ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? '100%' : '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              className="xl:hidden"
              style={{
                position: 'fixed',
                top: 0, bottom: 0,
                zIndex: 100,
                width: '288px',
                maxWidth: '85vw',
                [isRTL ? 'right' : 'left']: 0,
              }}
            >
              <button
                onClick={() => setDrawerOpen(false)}
                className="absolute z-10 w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
                style={{
                  top: '1rem',
                  [isRTL ? 'left' : 'right']: '0.75rem',
                  background: 'var(--hover-bg)',
                  color: 'var(--foreground-muted)',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--foreground)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--foreground-muted)'}
              >
                <X className="w-4 h-4" />
              </button>
              <div style={{ width: '288px', maxWidth: '85vw', height: '100%' }}>
                <Sidebar showCollapseButton={false} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Main area ─── */}
        <div className="dashboard-bg-layer flex-1 flex flex-col min-w-0 overflow-hidden">
          <Navbar onMenuClick={() => setDrawerOpen(true)} />

          {/*
            `flex flex-col` turns the scroll area into a column, and `grow` on the
            content below makes it absorb any leftover space — which pushes the
            footer to the bottom on short pages (e.g. Admin Control) while still
            letting it scroll away naturally on long ones.
          */}
          <main className="flex-1 overflow-y-auto flex flex-col">
            {/* Page content */}
            <div className="p-4 sm:p-6 lg:p-8 grow">
              {children}
            </div>

            {/* Footer — sits at the bottom of the scrollable area */}
            <Footer />
          </main>
        </div>

      </div>
    </UserProvider>
  );
}