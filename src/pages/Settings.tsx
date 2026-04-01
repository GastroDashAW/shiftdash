import { GdprSection } from '@/components/settings/GdprSection';

export default function Settings() {
  return (
    <div className="space-y-6 pb-20 md:pb-4">
      <h1 className="font-heading text-2xl font-bold">Einstellungen</h1>
      <GdprSection />
    </div>
  );
}