import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
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

  return (
    <Card className="w-full max-w-md overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <motion.img
            src={dashAvatar}
            alt="Dash"
            className="h-16 w-16 rounded-full object-contain"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          />
          <div>
            <motion.h3
              className="font-heading text-lg font-semibold"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              Hallo! Ich bin Dash.
            </motion.h3>
            <motion.p
              className="text-xs text-muted-foreground"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              Dein Assistent für ShiftDash – ich helfe dir beim Einstieg, beantworte Fragen und begleite dich durch das Programm.
            </motion.p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeAnswer ? (
            <motion.div
              key="answer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-lg bg-muted px-3 py-2.5 text-sm"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Dash</span>
                <button onClick={() => setActiveAnswer(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:m-0">
                <ReactMarkdown>{activeAnswer}</ReactMarkdown>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="questions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-wrap gap-2"
            >
              {QUICK_QUESTIONS.map((item, i) => (
                <motion.button
                  key={item.q}
                  onClick={() => setActiveAnswer(item.a)}
                  className="rounded-full border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.08 }}
                >
                  {item.q}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
