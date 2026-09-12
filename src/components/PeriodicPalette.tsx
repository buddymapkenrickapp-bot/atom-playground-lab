import { CATEGORY_LABELS, ELEMENTS, type Category } from "@/data/elements";
import { ISOTOPES } from "@/data/isotopes";
import { useMemo, useState } from "react";

type Props = {
  selected: string | null;
  onSelect: (symbol: string) => void;
};

const GROUPS: { key: string; label: string; test: (c: Category, radioactive: boolean) => boolean }[] = [
  { key: "all", label: "All 118", test: () => true },
  { key: "radioactive", label: "Radioactive", test: (_c, r) => r },
  { key: "metals", label: "Metals", test: (c) => ["alkali", "alkaline", "transition", "post", "lanthanide", "actinide"].includes(c) },
  { key: "nonmetals", label: "Nonmetals", test: (c) => ["nonmetal", "halogen", "noble", "metalloid"].includes(c) },
];

export function PeriodicPalette({ selected, onSelect }: Props) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const isotopeMode = filter === "isotopes";

  const isotopeItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ISOTOPES.filter(
      (isotope) =>
        !q ||
        isotope.label.toLowerCase().startsWith(q) ||
        isotope.symbol.toLowerCase().startsWith(q) ||
        isotope.element.toLowerCase().includes(q) ||
        String(isotope.mass) === q,
    );
  }, [query]);

  const elementItems = useMemo(() => {
    const group = GROUPS.find((g) => g.key === filter);
    if (!group) return [];
    const q = query.trim().toLowerCase();
    return ELEMENTS.filter(
      (e) =>
        group.test(e.category, e.radioactive) &&
        (!q || e.symbol.toLowerCase().startsWith(q) || e.name.toLowerCase().includes(q) || String(e.z) === q),
    );
  }, [filter, query]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {GROUPS.map((g) => (
          <button
            key={g.key}
            onClick={() => setFilter(g.key)}
            className={`rounded-md border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors ${
              filter === g.key
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {g.label}
          </button>
        ))}
        <button
          onClick={() => setFilter("isotopes")}
          className={`rounded-md border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors ${
            isotopeMode
              ? "border-primary bg-primary/15 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          Isotopes
        </button>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search element…"
          className="ml-auto w-40 rounded-md border border-border bg-card px-2.5 py-1 font-mono text-[11px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
        />
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-1.5 overflow-y-auto pr-1">
        {isotopeMode
          ? isotopeItems.map((isotope) => {
              const element = ELEMENTS.find((entry) => entry.symbol === isotope.symbol)!;
              return (
                <button
                  key={isotope.label}
                  draggable
                  onDragStart={(ev) => ev.dataTransfer.setData("text/plain", isotope.label)}
                  onClick={() => onSelect(isotope.label)}
                  title={`${isotope.label} · ${isotope.element}${isotope.radioactive ? ` · radioactive${isotope.halfLife ? ` · half-life ${isotope.halfLife}` : ""}` : " · stable"}`}
                  className={`group relative flex aspect-square flex-col items-center justify-center rounded-md border transition-transform hover:-translate-y-0.5 ${
                    selected === isotope.label ? "border-primary ring-1 ring-primary" : "border-border"
                  }`}
                  style={{ backgroundColor: `color-mix(in oklab, ${element.color} 14%, transparent)` }}
                >
                  <span className="absolute left-1 top-0.5 font-mono text-[8px] text-muted-foreground">{element.z}</span>
                  {isotope.radioactive && <span className="absolute right-1 top-0.5 font-mono text-[8px] text-[#a8ff8a]">☢</span>}
                  <span className="font-mono text-sm font-semibold" style={{ color: element.color }}>
                    {isotope.symbol}
                  </span>
                  <span className="font-mono text-[10px] text-foreground">-{isotope.mass}</span>
                </button>
              );
            })
          : elementItems.map((e) => (
          <button
            key={e.z}
            draggable
            onDragStart={(ev) => ev.dataTransfer.setData("text/plain", e.symbol)}
            onClick={() => onSelect(e.symbol)}
            title={`${e.name} · Z=${e.z} · ${CATEGORY_LABELS[e.category]}${e.radioactive ? " · radioactive" : ""}`}
            className={`group relative flex aspect-square flex-col items-center justify-center rounded-md border transition-transform hover:-translate-y-0.5 ${
              selected === e.symbol ? "border-primary ring-1 ring-primary" : "border-border"
            }`}
            style={{ backgroundColor: `color-mix(in oklab, ${e.color} 14%, transparent)` }}
          >
            <span className="absolute left-1 top-0.5 font-mono text-[8px] text-muted-foreground">{e.z}</span>
            {e.radioactive && (
              <span className="absolute right-1 top-0.5 font-mono text-[8px] text-[#a8ff8a]">☢</span>
            )}
            <span className="font-mono text-sm font-semibold" style={{ color: e.color }}>
              {e.symbol}
            </span>
            <span className="max-w-full truncate px-0.5 text-[7px] uppercase tracking-wide text-muted-foreground">
              {e.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
