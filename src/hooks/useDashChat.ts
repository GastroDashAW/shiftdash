import { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { backendPublishableKey, backendUrl } from '@/lib/backend-config';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${backendUrl}/functions/v1/dash-chat`;

export function useDashChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const { isAdmin } = useAuth();

  const send = useCallback(async (input: string) => {
    const userMsg: Msg = { role: 'user', content: input };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setIsLoading(true);

    let assistantSoFar = '';
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${backendPublishableKey}`,
        },
        body: JSON.stringify({
          messages: allMessages,
          currentPage: location.pathname,
          isAdmin,
        }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: 'Fehler' }));
        upsertAssistant(err.error || 'Ein Fehler ist aufgetreten.');
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error('Dash chat error:', e);
      upsertAssistant('Verbindungsfehler. Bitte versuche es erneut.');
    }

    setIsLoading(false);
  }, [messages, location.pathname, isAdmin]);

  const reset = useCallback(() => setMessages([]), []);

  return { messages, isLoading, send, reset };
}
