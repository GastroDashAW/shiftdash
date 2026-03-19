import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDashChat } from '@/hooks/useDashChat';
import ReactMarkdown from 'react-markdown';
import dashAvatar from '@/assets/dash-avatar.png';

const QUICK_QUESTIONS = [
  'Was kann ShiftDash?',
  'Wie funktioniert das Stempeln?',
  'Wie erstelle ich einen Dienstplan?',
  'Was ist der L-GAV?',
];

export function DashChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, isLoading, send, reset } = useDashChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSend = (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;
    send(msg);
    setInput('');
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-4 z-[60] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col rounded-xl border bg-card shadow-2xl md:bottom-6 md:right-6 md:w-[400px]"
            style={{ height: 'min(520px, calc(100vh - 10rem))' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <img src={dashAvatar} alt="Dash" className="h-8 w-8 rounded-full object-contain" />
              <div className="flex-1">
                <p className="font-heading text-sm font-semibold">Dash</p>
                <p className="text-xs text-muted-foreground">ShiftDash Assistent</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={reset} title="Chat zurücksetzen">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef as any}>
              <div ref={scrollRef} className="space-y-3">
                {messages.length === 0 && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <img src={dashAvatar} alt="Dash" className="mt-0.5 h-6 w-6 rounded-full object-contain" />
                      <div className="rounded-lg bg-muted px-3 py-2 text-sm">
                        Hallo! 👋 Ich bin <strong>Dash</strong>, dein Assistent für ShiftDash. Wie kann ich dir helfen?
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pl-8">
                      {QUICK_QUESTIONS.map(q => (
                        <button
                          key={q}
                          onClick={() => handleSend(q)}
                          className="rounded-full border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {msg.role === 'assistant' && (
                      <img src={dashAvatar} alt="Dash" className="mt-0.5 h-6 w-6 flex-shrink-0 rounded-full object-contain" />
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex items-start gap-2">
                    <img src={dashAvatar} alt="Dash" className="mt-0.5 h-6 w-6 rounded-full object-contain" />
                    <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                      <span className="inline-flex gap-1">
                        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>·</span>
                        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>·</span>
                        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>·</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t px-3 py-2">
              <form
                onSubmit={e => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2"
              >
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Frag Dash…"
                  className="h-9 text-sm"
                  disabled={isLoading}
                />
                <Button type="submit" size="icon" className="h-9 w-9 flex-shrink-0" disabled={isLoading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-20 right-4 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 md:bottom-6 md:right-6 md:h-14 md:w-14 print:hidden"
        whileTap={{ scale: 0.9 }}
        title="Dash öffnen"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="h-5 w-5 md:h-6 md:w-6" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <img src={dashAvatar} alt="Dash" className="h-8 w-8 rounded-full object-contain md:h-10 md:w-10" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
