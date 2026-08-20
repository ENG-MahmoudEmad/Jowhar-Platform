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
} from '@/app/(dashboard)/chat/chatActions'

/*
  Hook مركزي لقناة شات واحدة: يجيب الرسائل، يشترك بـPusher للتحديث
  اللحظي، وبيدير Optimistic UI لكل عملية (إرسال/حذف/تثبيت).

  ⚠️ نفس درس NotificationBell.tsx: القناة (channel subscribe) لازم
  تُبنى فقط لما channelId يكون جاهز، وننضّف الاشتراك القديم قبل
  الاشتراك بالجديد لما channelId يتغيّر — وإلا بنضل مشتركين بقنوات
  قديمة ومتسربة بالذاكرة.
*/
export function useChatChannel(channelId: string | null, currentUserId: string) {
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

    channel.bind('message-updated', (msg: ChatMessageData) => {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
    });

    return () => {
      pusherClient.unsubscribe(`chat-channel-${channelId}`);
    };
  }, [channelId]);

  /* ── إرسال رسالة (Optimistic) ── */
  const sendMessage = useCallback(
    async (content: string, replyToMessageId?: string) => {
      if (!channelId || !content.trim()) return;

      const tempId = `temp-${Date.now()}`;
      const optimistic: ChatMessageData = {
        id: tempId,
        senderId: currentUserId,
        senderName: '',
        senderInitials: '',
        senderColor: '#458482',
        senderAvatarUrl: null,
        content: content.trim(),
        createdAt: new Date().toISOString(),
        isPinned: false,
        isDeleted: false,
        editedAt: null,
        replyTo: null,
        forwardedFrom: null,
      };

      setMessages((prev) => [...prev, optimistic]);

      try {
        const real = await sendChatMessageAction(
          channelId,
          content.trim(),
          replyToMessageId,
          getPusherSocketId(),
        );
        setMessages((prev) => prev.map((m) => (m.id === tempId ? real : m)));
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    },
    [channelId, currentUserId],
  );

  /* ── حذف رسالة (Optimistic) ── */
  const deleteMessage = useCallback(async (messageId: string) => {
    const previous = messagesRef.current;
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, isDeleted: true } : m)));

    try {
      await deleteChatMessageAction(messageId);
    } catch {
      setMessages(previous);
    }
  }, []);

  /* ── تثبيت/إلغاء تثبيت (Optimistic) ── */
  const togglePin = useCallback(async (messageId: string, pin: boolean) => {
    const previous = messagesRef.current;
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, isPinned: pin } : m)));

    try {
      await toggleChatMessagePinAction(messageId, pin);
    } catch {
      setMessages(previous);
    }
  }, []);

  /* ── Forward (بدون تعديل تفاؤلي محلي — بيبان بالقناة الوجهة عبر Pusher) ── */
  const forwardMessage = useCallback(async (messageId: string, toChannelId: string) => {
    await forwardChatMessageAction(messageId, toChannelId);
  }, []);

  return { messages, loading, sendMessage, deleteMessage, togglePin, forwardMessage };
}   