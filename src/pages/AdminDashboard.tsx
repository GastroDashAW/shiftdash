import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { LiveOpsDashboard } from '@/components/dashboard/LiveOpsDashboard';

import tileStempeln from '@/assets/tile-stempeln.png';
import tileDienstplan from '@/assets/tile-dienstplan.png';
import tileValidierung from '@/assets/tile-validierung.png';

const employeeTiles = [
  { label: 'Stempeln', to: '/clock', image: tileStempeln, desc: 'Ein-/Ausstempeln & Absenzen' },
  { label: 'Dienstplan', to: '/schedule', image: tileDienstplan, desc: 'Deine Schichten einsehen' },
  { label: 'Abwesenheit', to: '/leave', image: tileValidierung, desc: 'Ferien & Frei beantragen' },
];

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  if (isAdmin) {
    return <LiveOpsDashboard />;
  }

  return (
    <div className="space-y-6 pb-20 md:pb-4">
      <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {employeeTiles.map((tile, i) => (
          <motion.div
            key={tile.to}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card
              className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => navigate(tile.to)}
            >
              <div className="relative h-28 sm:h-36 overflow-hidden bg-muted">
                <img
                  src={tile.image}
                  alt={tile.label}
                  className="h-full w-full object-contain p-3 transition-transform group-hover:scale-110"
                />
              </div>
              <CardContent className="p-3">
                <p className="font-heading font-semibold text-sm">{tile.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{tile.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
