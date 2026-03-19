import { createRoot } from "react-dom/client";
import "./index.css";

type MemoryStorageRecord = Record<string, string>;

function createMemoryStorage(): Storage {
  let store: MemoryStorageRecord = {};

  return {
    get length() {
      return Object.keys(store).length;
    },
    clear() {
      store = {};
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null;
    },
    removeItem(key: string) {
      delete store[key];
    },
    setItem(key: string, value: string) {
      store[key] = String(value);
    },
  };
}

function ensureStorageAvailability() {
  if (typeof window === "undefined") return;

  const applyFallback = (storageType: "localStorage" | "sessionStorage") => {
    try {
      const storage = window[storageType];
      const testKey = `__shiftdash_${storageType}_test__`;
      storage.setItem(testKey, "1");
      storage.removeItem(testKey);
    } catch {
      const fallbackStorage = createMemoryStorage();

      try {
        Object.defineProperty(window, storageType, {
          configurable: true,
          value: fallbackStorage,
        });
      } catch {
        Object.assign(window, { [storageType]: fallbackStorage });
      }
    }
  };

  applyFallback("localStorage");
  applyFallback("sessionStorage");
}

function AppBootError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="font-heading text-2xl font-semibold">App konnte nicht geladen werden</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Bitte deaktiviere in Brave testweise die Shields für diese Seite und lade sie neu.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Neu laden
        </button>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);

function renderBootError() {
  root.render(<AppBootError />);
}

window.addEventListener("error", renderBootError);
window.addEventListener("unhandledrejection", renderBootError);

async function bootstrap() {
  ensureStorageAvailability();

  try {
    const { default: App } = await import("./App.tsx");
    root.render(<App />);
  } catch (error) {
    console.error("Application bootstrap error:", error);
    renderBootError();
  }
}

bootstrap();
