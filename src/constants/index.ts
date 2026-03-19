export const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
] as const;

export const WEEKDAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const;

export const POSITION_HIERARCHY: Record<string, number> = {
  'Geschäftsführer': 1, 'Direktor': 2, 'Betriebsleiter': 3,
  'Küchenchef': 10, 'Sous-Chef': 11, 'Chef de Partie': 12, 'Demichef': 13,
  'Commis': 14, 'Koch': 15, 'Hilfskoch': 16,
  'Restaurantleiter': 20, 'Chef de Service': 21, 'Serviceleiter': 22,
  'Servicefachangestellte': 23, 'Servicemitarbeiter': 24,
  'Barkeeper': 30, 'Rezeptionist': 31, 'Hausdame': 32, 'Zimmermädchen': 33,
  'Lehrling': 90, 'Aushilfe': 91, 'Praktikant': 92,
};

export const ABSENCE_LABELS: Record<string, string> = {
  vacation: 'Ferien',
  sick: 'Krankheit',
  accident: 'Unfall',
  holiday: 'Feiertag',
  military: 'Militär',
  other: 'Andere',
};

export const DEFAULT_VAT_RATE = 8.1;

export const DEFAULT_DAY_WEIGHTS: Record<string, number> = {
  Mo: 1, Di: 1, Mi: 1, Do: 1, Fr: 1.3, Sa: 1.5, So: 0.7,
};

export const SWISS_TIMEZONE = 'Europe/Zurich';

export function getPositionOrder(position: string): number {
  const normalized = position.trim();
  if (POSITION_HIERARCHY[normalized] !== undefined) return POSITION_HIERARCHY[normalized];
  for (const [key, val] of Object.entries(POSITION_HIERARCHY)) {
    if (normalized.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return 50;
}
