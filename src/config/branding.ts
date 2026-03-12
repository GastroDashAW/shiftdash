/**
 * Zentrale Branding-Konfiguration
 * 
 * Passe diese Werte an, um das Branding für einen spezifischen Kunden zu ändern.
 * Logo: Ersetze die Datei unter src/assets/shiftdash-logo.png
 * Farben: Passe die CSS-Variablen in src/index.css an
 */

export const BRANDING = {
  /** Name der App / des Kunden */
  appName: 'ShiftDash',

  /** Untertitel auf der Login-Seite */
  tagline: 'Dienstplanung & Zeiterfassung',

  /** Ist dies eine Test-/Staging-Umgebung? */
  isStaging: true,

  /** Text im Staging-Banner */
  stagingLabel: 'Test-Umgebung',

  /** Support-Kontakt (optional) */
  supportEmail: '',
} as const;
