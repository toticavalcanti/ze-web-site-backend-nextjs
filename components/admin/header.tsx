'use client';

import { useMemo, useState, useTransition, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

export function Header({ name, email, role }: HeaderProps) {
  const [isPending, startTransition] = useTransition();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  // Poll for notifications every 30 seconds
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/admin/notifications/unread-count');
        if (res.ok) {
          const data = await res.json();
          setNotificationCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    fetchNotifications(); // Initial fetch
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s

    return () => clearInterval(interval);
  }, []);

  const displayName = useMemo(() => {
    if (!name) return email ?? 'Administrador';
    const [first, second] = name.split(' ');
    return second ? `${first} ${second}` : first;
  }, [name, email]);

  const roleLabel = useMemo(() => {
    if (!role) return 'Equipe editorial';
    return role === 'super_admin' ? 'Super administrador' : 'Administrador';
  }, [role]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative z-20 flex h-24 items-center justify-between overflow-hidden border-b border-white/60 bg-white/70 px-8 shadow-lg backdrop-blur-xl"
    >
      <div className="relative space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span>Dashboard criativo</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Bem-vindo de volta, {displayName}!</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-pink-500/10 px-3 py-1 font-semibold text-slate-600 shadow-inner">
              <Sparkles className="h-3.5 w-3.5 text-purple-500" /> {roleLabel}
            </span>
            <span className="rounded-full bg-white/80 px-3 py-1 text-slate-500 shadow-sm">Autenticado como {email ?? name}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-slate-500 shadow-md transition hover:border-purple-200 hover:text-purple-600"
            aria-label="Ver notificações"
          >
            <Bell className="h-4 w-4" />
            {notificationCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-500 text-[10px] font-semibold text-white shadow-lg">
                {notificationCount}
              </span>
            )}
          </motion.button>
          <AnimatePresence>
            {showNotifications && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-14 z-50 w-80 rounded-2xl border border-white/70 bg-white/95 p-4 shadow-2xl backdrop-blur-xl"
                >
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">Notificações</h3>
                  {notificationCount > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 rounded-xl bg-purple-50 p-4">
                        <Bell className="h-8 w-8 text-purple-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">
                            Você tem {notificationCount} {notificationCount === 1 ? 'mensagem pendente' : 'mensagens pendentes'}
                          </p>
                          <p className="text-xs text-slate-500">Aguardando publicação</p>
                        </div>
                      </div>
                      <Link
                        href="/admin/messages"
                        onClick={() => setShowNotifications(false)}
                        className="block w-full rounded-lg bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 px-4 py-2 text-center text-sm font-semibold text-white transition hover:brightness-110"
                      >
                        Ver mensagens
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Bell className="mb-3 h-12 w-12 text-slate-300" />
                      <p className="text-sm text-slate-500">Sem notificações no momento</p>
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
        <Button
          className="rounded-2xl bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 px-6 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
          onClick={() =>
            startTransition(async () => {
              await signOut({ callbackUrl: '/' });
            })
          }
          disabled={isPending}
        >
          Sair
        </Button>
      </div>
    </motion.header>
  );
}
