"use client"

import { useEffect, useState } from 'react';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';
import Sidebar from '@/components/dashboard/Sidebar';
import Navbar from '@/components/dashboard/Navbar';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { applyRTLToPage, lang, isRTL } = useLang();
  const { theme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* ── Apply RTL to <html> whenever lang changes (dashboard only) ── */
  useEffect(() => {
    applyRTLToPage();
  }, [lang]);

  /* ── Close drawer on resize to desktop ── */
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 1024) setDrawerOpen(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  /* ── Lock body scroll when drawer is open ── */
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  return (
    <div className="flex h-screen overflow-hidden dashboard-bg bg-[var(--background)] text-[var(--foreground)]">

      {/* ─── Desktop Sidebar ─── */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar />
      </div>

      {/* ─── Mobile Drawer Backdrop ─── */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setDrawerOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── Mobile Drawer ─── */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            key="drawer"
            initial={{ x: isRTL ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: isRTL ? '100%' : '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className={`fixed top-0 ${isRTL ? 'right-0' : 'left-0'} h-full z-50 lg:hidden`}
          >
            {/* Close button */}
            <button
              onClick={() => setDrawerOpen(false)}
              className={`absolute top-4 ${isRTL ? 'left-3' : 'right-3'} z-10 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover-bg)] transition-all`}
            >
              <X className="w-4 h-4" />
            </button>
            <Sidebar />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Main content ─── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Navbar with mobile menu button */}
        <Navbar onMenuClick={() => setDrawerOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}