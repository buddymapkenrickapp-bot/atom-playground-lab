import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { PeriodicPalette } from "@/components/PeriodicPalette";
import { Sandbox, type Controls, type SandboxHandle } from "@/components/Sandbox";
import { BY_SYMBOL } from "@/data/elements";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Los Alamos — Periodic Table Reaction Sandbox" },
      {
        name: "description",
        content:
          "Drop any of the 118 elements into a vacuum chamber, watch them react, and run a fusion reactor, gravity asserter and pressure asserter.",
      },
      { property: "og:title", content: "Los Alamos — Periodic Table Reaction Sandbox" },
      {
        property: "og:description",
        content:
          "A live element sandbox: real reactions, radioactive decay, fusion, gravity and pressure controls.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type LogEntry = { id: number; text: string; color: string };
let logId = 1;

function Index() {
  const [selected, setSelected] = useState<string | null>("H");
  const [gravity, setGravity] = useState(0.35);
  const [pressure, setPressure] = useState(0);
  const [fusion, setFusion] = useState(false);
  const [temperature, setTemperature] = useState(298);
  const [log, setLog] = useState<LogEntry[]>([]);
  const handleRef = useRef<SandboxHandle | null>(null);

  const controls: Controls = { gravity, pressure, fusion, temperature };


  const pushLog = (text: string, color: string) =>
    setLog((prev) => [{ id: logId++, text, color }, ...prev].slice(0, 60));

  const selectedInfo = selected ? BY_SYMBOL[selected] : undefined;

  return (
    <div className="flex h-screen flex-col gap-3 bg-background p-3 text-foreground">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Los Alamos
          <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.25em] text-primary">
            element sandbox
          </span>
        </h1>
        <p className="hidden text-xs text-muted-foreground md:block">
          Pick an element, then click inside the chamber (or drag a tile in) to place it. Collisions react.
        </p>
        <button
          onClick={() => handleRef.current?.clear()}
          className="ml-auto rounded-md border border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
        >
          Purge chamber
        </button>
      </header>

      <main className="flex min-h-0 flex-1 gap-3">
        <div className="min-h-0 flex-1">
          <Sandbox selected={selected} controls={controls} onLog={pushLog} handleRef={handleRef} />
        </div>

        <aside className="flex w-72 min-h-0 shrink-0 flex-col gap-3">
          <section className="rounded-xl border border-border bg-card p-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Instruments
            </h2>

            <button
              onClick={() => setFusion((f) => !f)}
              className={`mt-3 w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                fusion
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-foreground hover:border-primary/60"
              }`}
            >
              <span className="block font-display text-sm font-semibold">Fusion Reactor</span>
              <span className="block font-mono text-[10px] text-muted-foreground">
                {fusion ? "ONLINE · confining to core" : "OFFLINE"}
              </span>
            </button>

            <label className="mt-4 block">
              <span className="flex items-baseline justify-between font-mono text-[11px] text-muted-foreground">
                Gravity Asserter <span className="text-foreground">{gravity.toFixed(2)} g</span>
              </span>
              <input
                type="range"
                min={0}
                max={2}
                step={0.05}
                value={gravity}
                onChange={(e) => setGravity(Number(e.target.value))}
                className="mt-1.5 w-full accent-[var(--color-primary)]"
              />
            </label>

            <label className="mt-3 block">
              <span className="flex items-baseline justify-between font-mono text-[11px] text-muted-foreground">
                Pressure Asserter <span className="text-foreground">{Math.round(pressure * 100)} kbar</span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={pressure}
                onChange={(e) => setPressure(Number(e.target.value))}
                className="mt-1.5 w-full accent-[var(--color-destructive)]"
              />
            </label>
            <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
              Pressure compresses the sample toward the core and accelerates radioactive decay. Fusion
              merges two elements into Z₁+Z₂.
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card p-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Selected
            </h2>
            {selectedInfo ? (
              <div className="mt-2 flex items-center gap-3">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-md font-mono text-lg font-semibold"
                  style={{
                    color: selectedInfo.color,
                    backgroundColor: `color-mix(in oklab, ${selectedInfo.color} 16%, transparent)`,
                  }}
                >
                  {selectedInfo.symbol}
                </span>
                <div className="text-xs">
                  <div className="font-display text-sm">{selectedInfo.name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    Z={selectedInfo.z}
                    {selectedInfo.radioactive ? " · radioactive ☢" : ""}
                  </div>
                </div>
                <button
                  onClick={() => handleRef.current?.spawn(selectedInfo.symbol)}
                  className="ml-auto rounded-md border border-primary/60 px-2 py-1 font-mono text-[10px] uppercase text-primary hover:bg-primary/10"
                >
                  Inject
                </button>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Nothing selected.</p>
            )}
          </section>

          <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-card p-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Reaction log
            </h2>
            <ul className="mt-2 flex-1 space-y-1 overflow-y-auto pr-1 font-mono text-[10.5px] leading-relaxed">
              {log.length === 0 && <li className="text-muted-foreground">Chamber idle.</li>}
              {log.map((entry) => (
                <li key={entry.id} style={{ color: entry.color }}>
                  {entry.text}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </main>

      <section className="h-[34vh] min-h-[190px] shrink-0 rounded-xl border border-border bg-card p-3">
        <PeriodicPalette selected={selected} onSelect={setSelected} />
      </section>
    </div>
  );
}
