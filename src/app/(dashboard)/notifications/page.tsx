// src/app/(dashboard)/notifications/page.tsx
import { createClient } from '@/lib/supabase/server';
import { listMyNotificationsPage } from '../notificationsActions';
import NotificationsClient from './NotificationsClient';

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ items, nextCursor }, unreadResult] = await Promise.all([
    listMyNotificationsPage(),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user?.id ?? '')
      .eq('is_read', false),
  ]);

  return (
    <NotificationsClient
      initialItems={items}
      initialCursor={nextCursor}
      initialUnreadCount={unreadResult.count ?? 0}
    />
  );
}