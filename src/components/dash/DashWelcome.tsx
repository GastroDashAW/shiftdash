import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import dashAvatar from '@/assets/dash-avatar.png';

const QUICK_QUESTIONS: { q: string; a: string }[] = [
  {
    q: 'Was kann ShiftDash?',
    a: 'ShiftDash ist eine webbasierte Lösung für **Personalmanagement & Zeiterfassung** in der Schweizer Gastronomie. Funktionen umfassen Stempeluhr, Dienstplanung, Mitarbeiterverwaltung, L-GAV-Validierung, Export und Budget-Analyse – alles L-GAV konform. 🇨🇭',
  },
  {
    q: 'Wie funktioniert das Stempeln?',
    a: 'Nach dem Login kannst du dich mit einem Klick **ein- und ausstempeln**. Absenzen wie Ferien, Krankheit oder Feiertage kannst du direkt über die Stempelseite erfassen. Dein Admin sieht alle Einträge in der Tageskontrolle.',
  },
  {
    q: 'Für wen ist ShiftDash gedacht?',
    a: 'ShiftDash ist für **Restaurants, Hotels und Gastro-Betriebe** in der Schweiz entwickelt. Admins verwalten Personal, Dienstpläne und Abrechnungen – Mitarbeiter stempeln und sehen ihren Plan. Alles nach **L-GAV** Richtlinien.',
  },
  {
    q: 'Wie erstelle ich einen Dienstplan?',
    a: 'Gehe zu **Dienstplan (/schedule)**, wähle die gewünschte Woche und weise Mitarbeitern Schichten zu. Ruhetage werden automatisch berücksichtigt wenn Auto-Sync aktiv ist. Du kannst auch den Schichtplan-Generator nutzen.',
  },
];

export function DashWelcome() {
  const [activeAnswer, setActiveAnswer] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <img
        src={dashAvatar}
        alt="Dash"
        className="h-9 w-9 flex-shrink-0 rounded-full object-contain"
      />
      <div className="flex-1 min-w-0 space-y-2">
        <div>
          <p className="text-sm font-medium leading-tight">
            Hallo! Ich bin <strong>Dash</strong>.
          </p>
          <p className="text-xs text-muted-foreground">
            Dein ShiftDash-Assistent – frag mich etwas!
          </p>
        </div>

        <AnimatePresence mode="wait">
          {activeAnswer ? (
            <motion.div
              key="answer"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-md bg-muted px-2.5 py-2 text-xs"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground">Dash</span>
                <button onClick={() => { setActiveAnswer(null); setFocused(false); }} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="prose prose-xs max-w-none dark:prose-invert [&>p]:m-0 text-xs">
                <ReactMarkdown>{activeAnswer}</ReactMarkdown>
              </div>
            </motion.div>
          ) : (
            <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="relative">
                <Input
                  placeholder="Frag Dash…"
                  className="h-8 pr-8 text-xs"
                  onFocus={() => setFocused(true)}
                  onBlur={() => setTimeout(() => setFocused(false), 200)}
                  readOnly
                />
                <Send className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>

              <AnimatePresence>
                {focused && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {QUICK_QUESTIONS.map((item, i) => (
                        <motion.button
                          key={item.q}
                          onClick={() => setActiveAnswer(item.a)}
                          className="rounded-full border bg-background px-2.5 py-1 text-[11px] transition-colors hover:bg-accent hover:text-accent-foreground"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          {item.q}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
