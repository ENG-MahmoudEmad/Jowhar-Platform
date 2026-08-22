// src/lib/chat/useChatChannel.ts
"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { pusherClient, getPusherSocketId } from '@/lib/pusher/client'
import type { ChatMessageData } from '@/components/dashboard/chat/ChatMessageBubble'
import {
  sendChatMessageAction,
  deleteChatMessageAction,
  toggleChatMessagePinAction,
  forwardChatMessageAction,
  toggleChatMessageReactionAction,
  markChatMessagesReadAction,
} from '@/app/(dashboard)/chat/chatActions'

/*
  Hook مركزي لقناة شات واحدة: يجيب الرسائل، يشترك بـPusher للتحديث
  اللحظي، وبيدير Optimistic UI لكل عملية (إرسال/حذف/تثبيت).

  ⚠️ نفس درس NotificationBell.tsx: القناة (channel subscribe) لازم
  تُبنى فقط لما channelId يكون جاهز، وننضّف الاشتراك القديم قبل
  الاشتراك بالجديد لما channelId يتغيّر — وإلا بنضل مشتركين بقنوات
  قديمة ومتسربة بالذاكرة.
*/
export function useChatChannel(
  channelId: string | null,
  currentUserId: string,
  currentUserDisplay: { name: string; initials: string; color: string; avatarUrl: string | null },
) {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  /* ── الجلب الأولي عند تغيير القناة ── */
  useEffect(() => {
    if (!channelId) {
      setMessages([]);
      return;
    }

    let active = true;
    setLoading(true);

    fetch(`/api/chat/channels/${channelId}/messages`)
      .then((r) => r.json())
      .then((rows: ChatMessageData[] | { error: string }) => {
        if (active) setMessages(Array.isArray(rows) ? rows : []);
      })
      .catch(() => { if (active) setMessages([]); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [channelId]);

  /* ── الاشتراك اللحظي بـPusher ── */
  useEffect(() => {
    if (!channelId) return;

    const channel = pusherClient.subscribe(`chat-channel-${channelId}`);

    channel.bind('new-message', (msg: ChatMessageData) => {
      if (messagesRef.current.some((m) => m.id === msg.id)) return;
      setMessages((prev) => [...prev, msg]);
    });

    channel.bind('message-updated', (patch: Partial<ChatMessageData> & { id: string }) => {
      setMessages((prev) => prev.map((m) => (m.id === patch.id ? { ...m, ...patch } : m)));
    });

    channel.bind(
      'reactions-updated',
      (payload: { messageId: string; reactions: { emoji: string; member_id: string; profiles?: { first_name?: string; last_name?: string } }[] }) => {
        const grouped = new Map<string, { count: number; reactedByMe: boolean; reactorNames: string[] }>();
        for (const r of payload.reactions) {
          const name = `${r.profiles?.first_name ?? ''} ${r.profiles?.last_name ?? ''}`.trim();
          const entry = grouped.get(r.emoji) ?? { count: 0, reactedByMe: false, reactorNames: [] };
          entry.count += 1;
          entry.reactorNames.push(name);
          if (r.member_id === currentUserId) entry.reactedByMe = true;
          grouped.set(r.emoji, entry);
        }
        const reactions = Array.from(grouped.entries()).map(([emoji, v]) => ({ emoji, ...v }));

        setMessages((prev) =>
          prev.map((m) => (m.id === payload.messageId ? { ...m, reactions } : m)),
        );
      },
    );

    channel.bind('messages-read', (payload: { messageIds: string[]; readerId: string }) => {
      if (payload.readerId === currentUserId) return; // ما تحسب قراءتك أنت نفسك
      setMessages((prev) =>
        prev.map((m) =>
          payload.messageIds.includes(m.id) ? { ...m, readByCount: (m.readByCount ?? 0) + 1 } : m,
        ),
      );
    });

    return () => {
      pusherClient.unsubscribe(`chat-channel-${channelId}`);
    };
  }, [channelId]);

  /* ── إرسال رسالة (Optimistic + حالة فشل/إعادة محاولة زي تيليجرام) ── */
  const sendMessage = useCallback(
    async (content: string, replyToMessageId?: string) => {
      if (!channelId || !content.trim()) return;

      const tempId = `temp-${Date.now()}`;
      const optimistic: ChatMessageData = {
        id: tempId,
        senderId: currentUserId,
        senderName: currentUserDisplay.name,
        senderInitials: currentUserDisplay.initials,
        senderColor: currentUserDisplay.color,
        senderAvatarUrl: currentUserDisplay.avatarUrl,
        content: content.trim(),
        createdAt: new Date().toISOString(),
        isPinned: false,
        isDeleted: false,
        editedAt: null,
        replyTo: null,
        forwardedFrom: null,
        sendStatus: 'sending',
      };

      setMessages((prev) => [...prev, optimistic]);

      try {
        const real = await sendChatMessageAction(
          channelId,
          content.trim(),
          replyToMessageId,
          getPusherSocketId(),
          currentUserDisplay,
        );
        setMessages((prev) => prev.map((m) => (m.id === tempId ? real : m)));
      } catch {
        // ⚠️ عكس السلوك القديم: ما بنحذف الرسالة عند الفشل، منعلّمها
        // "فشلت" (زي تيليجرام) عشان المستخدم يقدر يعيد المحاولة بدل ما
        // تختفي رسالته بصمت ويحتاج يكتبها من جديد.
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, sendStatus: 'failed' } : m)),
        );
      }
    },
    [channelId, currentUserId, currentUserDisplay],
  );

  /* ── إعادة محاولة إرسال رسالة فاشلة ── */
  const retryMessage = useCallback(
    async (messageId: string) => {
      const failed = messagesRef.current.find((m) => m.id === messageId);
      if (!failed || !channelId) return;

      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, sendStatus: 'sending' } : m)),
      );

      try {
        const real = await sendChatMessageAction(
          channelId,
          failed.content ?? '',
          failed.replyTo?.id,
          getPusherSocketId(),
          currentUserDisplay,
        );
        setMessages((prev) => prev.map((m) => (m.id === messageId ? real : m)));
      } catch {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, sendStatus: 'failed' } : m)),
        );
      }
    },
    [channelId, currentUserDisplay],
  );

  /* ── حذف رسالة (Optimistic) ── */
  const deleteMessage = useCallback(async (messageId: string) => {
    const previous = messagesRef.current;
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, isDeleted: true } : m)));

    try {
      await deleteChatMessageAction(messageId, getPusherSocketId());
    } catch {
      setMessages(previous);
    }
  }, []);

  /* ── تثبيت/إلغاء تثبيت (Optimistic) ── */
  const togglePin = useCallback(async (messageId: string, pin: boolean) => {
    const previous = messagesRef.current;
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, isPinned: pin } : m)));

    try {
      await toggleChatMessagePinAction(messageId, pin, getPusherSocketId());
    } catch {
      setMessages(previous);
    }
  }, []);

  /* ── Forward (بدون تعديل تفاؤلي محلي — بيبان بالقناة الوجهة عبر Pusher) ── */
  const forwardMessage = useCallback(async (messageId: string, toChannelId: string) => {
    await forwardChatMessageAction(messageId, toChannelId);
  }, []);

  /* ── تفاعل إيموجي (Optimistic بسيط: نعكس محلياً وننتظر تأكيد الـPusher) ── */
  const reactMessage = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        await toggleChatMessageReactionAction(messageId, emoji, getPusherSocketId());
      } catch {
        // فشل التفاعل مش حرج — نتجاهل بصمت، الحالة السابقة تضل زي ما هي
      }
    },
    [],
  );

  /* ── تعليم رسائل كمقروءة (تُستدعى من IntersectionObserver بالواجهة) ── */
  const markRead = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return;
    try {
      await markChatMessagesReadAction(messageIds, getPusherSocketId());
    } catch {
      // best-effort
    }
  }, []);

  return {
    messages,
    loading,
    sendMessage,
    retryMessage,
    deleteMessage,
    togglePin,
    forwardMessage,
    reactMessage,
    markRead,
  };
}