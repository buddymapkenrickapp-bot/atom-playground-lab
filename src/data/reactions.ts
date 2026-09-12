import { BY_SYMBOL } from "@/data/elements";
import { predictBond } from "@/data/chemistry";

export type Reaction = {
  formula: string;
  name: string;
  energy: number; // 0..1 visual violence of the reaction
  color: string;
  /** temperature (K) needed before this reaction proceeds */
  activation: number;
  effect: "synthesis" | "oxidation" | "combustion" | "explosion" | "solution" | "precipitation";
  phase: "solid" | "liquid" | "gas" | "aqueous" | "mixed";
};

const R = (
  formula: string,
  name: string,
  energy = 0.4,
  color = "#e7f6ff",
  activation = 300,
  effect: Reaction["effect"] = "synthesis",
  phase: Reaction["phase"] = "solid",
): Reaction => ({ formula, name, energy, color, activation, effect, phase });

function key(a: string, b: string) {
  return [a, b].sort().join("+");
}

const DIGIT_MAP: Record<string, number> = {
  "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  "₀": 0, "₁": 1, "₂": 2, "₃": 3, "₄": 4, "₅": 5, "₆": 6, "₇": 7, "₈": 8, "₉": 9,
};

function parseNumericSuffix(raw: string | undefined): number {
  const digits = raw ?? "";
  if (!digits) return 1;
  let total = 0;
  for (const char of digits) {
    total += DIGIT_MAP[char] ?? 0;
  }
  return total || 1;
}

function mergeCounts(target: Record<string, number>, src: Record<string, number>, factor = 1) {
  for (const [symbol, count] of Object.entries(src)) {
    target[symbol] = (target[symbol] ?? 0) + count * factor;
  }
}

function parseGroup(source: string, startIndex: number): [Record<string, number>, number] {
  const local: Record<string, number> = {};
  let i = startIndex;

  while (i < source.length) {
    const ch = source[i] ?? "";

    if (ch === ")") {
      return [local, i + 1];
    }

    if (ch === "(") {
      const [subCounts, nextIndex] = parseGroup(source, i + 1);
      let multiplier = "";
      let j = nextIndex;
      while (j < source.length && /[0-9₀₁₂₃₄₅₆₇₈₉]/.test(source[j] ?? "")) {
        multiplier += source[j];
        j += 1;
      }
      mergeCounts(local, subCounts, parseNumericSuffix(multiplier));
      i = j;
      continue;
    }

    if (/[A-Z]/.test(ch)) {
      let symbol = ch;
      const next = source[i + 1] ?? "";
      if (/[a-z]/.test(next)) {
        symbol += next;
        i += 1;
      }

      let multiplier = "";
      let j = i + 1;
      while (j < source.length && /[0-9₀₁₂₃₄₅₆₇₈₉]/.test(source[j] ?? "")) {
        multiplier += source[j];
        j += 1;
      }

      local[symbol] = (local[symbol] ?? 0) + parseNumericSuffix(multiplier);
      i = j;
      continue;
    }

    i += 1;
  }

  return [local, i];
}

export function formulaToCounts(formula: string): Record<string, number> {
  const normalized = formula.replace(/\s+/g, "");
  const counts: Record<string, number> = {};

  for (const part of normalized.split("+")) {
    if (!part) continue;
    const [parsed] = parseGroup(part, 0);
    mergeCounts(counts, parsed);
  }

  return counts;
}

export function canFormFromParticleSet(
  particles: Array<{ label: string }>,
  formula: string,
): boolean {
  const needed = formulaToCounts(formula);
  if (Object.keys(needed).length === 0) return true;

  const available: Record<string, number> = {};
  for (const particle of particles) {
    mergeCounts(available, formulaToCounts(particle.label));
  }

  return Object.entries(needed).every(([symbol, count]) => (available[symbol] ?? 0) >= count);
}

const table: Record<string, Reaction> = {};
function add(a: string, b: string, r: Reaction) {
  table[key(a, b)] = r;
}

// Curated, textbook-correct chemistry. These override the generic predictor.
add("H", "O", R("H₂O", "Water formation", 0.9, "#7fd8ff", 500, "combustion", "mixed"));
add("H₂", "O", R("H₂O", "Water formation", 0.9, "#7fd8ff", 500, "combustion", "mixed"));
add("H", "O₂", R("H₂O", "Water formation", 0.9, "#7fd8ff", 500, "combustion", "mixed"));
add("H₂", "O₂", R("H₂O", "Water formation", 0.9, "#7fd8ff", 500, "combustion", "mixed"));
add("H", "H", R("H₂", "Hydrogen gas", 0.25, "#bfe8ff", 250, "synthesis", "gas"));
add("O", "O", R("O₂", "Oxygen gas", 0.25, "#8ad5ff", 250, "synthesis", "gas"));
add("N", "N", R("N₂", "Nitrogen gas", 0.2, "#9cc8ff", 300, "synthesis", "gas"));
add("Cl", "Cl", R("Cl₂", "Chlorine gas", 0.35, "#c9ffb5", 300, "synthesis", "gas"));
add("F", "F", R("F₂", "Fluorine gas", 0.4, "#cfe9ff", 300, "synthesis", "gas"));
add("H", "Cl", R("HCl", "Hydrochloric acid", 0.6, "#d9ff9e", 300));
add("H", "F", R("HF", "Hydrofluoric acid", 0.7, "#fff09e", 250));
add("H", "S", R("H₂S", "Hydrogen sulfide", 0.4, "#ffe9a3", 600));
add("H", "N", R("NH₃", "Ammonia", 0.5, "#a8d8ff", 700));
add("H", "C", R("CH₄", "Methane", 0.5, "#c9ffd6", 800));
add("Na", "Cl", R("NaCl", "Table salt", 0.8, "#ffffff", 250));
add("K", "Cl", R("KCl", "Potassium chloride", 0.8, "#f2f2ff", 250));
add("Li", "Cl", R("LiCl", "Lithium chloride", 0.7, "#ffe4d6", 250));
add("Na", "O", R("Na₂O₂", "Sodium peroxide", 0.7, "#ffd0b0", 450));
add("K", "O", R("KO₂", "Potassium superoxide", 0.8, "#ffcf9c", 350));
add("Na", "H", R("NaH", "Sodium hydride", 0.5, "#ffd9c2", 550));
add("Mg", "O", R("MgO", "Magnesia", 0.9, "#ffffff", 750));
add("Ca", "O", R("CaO", "Quicklime", 0.7, "#fff4dd", 600));
add("Ba", "O", R("BaO", "Barium oxide", 0.6, "#ffe7f2", 500));
add("C", "O", R("CO₂", "Carbon dioxide", 0.6, "#cfe8ff", 950, "combustion", "gas"));
add("S", "O", R("SO₂", "Sulfur dioxide", 0.5, "#fff2a8", 550, "oxidation", "gas"));
add("N", "O", R("NO", "Nitric oxide", 0.5, "#ffbb88", 1800, "oxidation", "gas"));
add("Si", "O", R("SiO₂", "Quartz", 0.4, "#dff3ff", 900));
add("Fe", "O", R("Fe₂O₃", "Iron(III) oxide", 0.3, "#ff9a6a", 900));
add("Fe", "S", R("FeS", "Iron sulfide", 0.4, "#d3b58a", 700));
add("Al", "O", R("Al₂O₃", "Alumina", 0.8, "#eaf4ff", 700));
add("Ti", "O", R("TiO₂", "Titania", 0.5, "#ffffff", 800));
add("Cu", "O", R("CuO", "Copper oxide", 0.4, "#8fd6c4", 700));
add("Zn", "O", R("ZnO", "Zinc oxide", 0.4, "#e8f6ff", 650));
add("Zn", "Cl", R("ZnCl₂", "Zinc chloride", 0.5, "#e0ffef", 400));
add("Ni", "O", R("NiO", "Nickel oxide", 0.4, "#9fe0a8", 800));
add("Cr", "O", R("Cr₂O₃", "Chromia", 0.4, "#7fffbf", 900));
add("Pb", "S", R("PbS", "Galena", 0.3, "#b0b6c4", 600));
add("Ag", "Cl", R("AgCl", "Silver chloride", 0.4, "#f4f4f4", 300));
add("Ca", "C", R("CaC₂", "Calcium carbide", 0.5, "#dcd0a0", 2200));
add("U", "F", R("UF₆", "Uranium hexafluoride", 0.8, "#b6ff7a", 350));
add("Pu", "O", R("PuO₂", "Plutonium dioxide", 0.9, "#ff7ba6", 500));
add("Th", "O", R("ThO₂", "Thoria", 0.6, "#ffa8c4", 600));
add("Cs", "O", R("Cs₂O", "Caesium oxide", 1, "#ffb066", 200));
add("Rb", "Cl", R("RbCl", "Rubidium chloride", 0.7, "#ffe0cc", 220));
add("Ca", "Cl", R("CaCl₂", "Calcium chloride", 0.7, "#fff8ea", 300));
add("Mg", "Cl", R("MgCl₂", "Magnesium chloride", 0.7, "#fff2f2", 350));
add("P", "O", R("P₄O₁₀", "Phosphorus pentoxide", 0.9, "#ffd7a1", 320));
add("B", "O", R("B₂O₃", "Boron oxide", 0.5, "#d6ffe9", 900));
add("W", "C", R("WC", "Tungsten carbide", 0.5, "#c0c8d8", 1800));
add("Fe", "C", R("Fe₃C", "Cementite / steel", 0.4, "#c8ced8", 1400));
add("Cu", "Zn", R("CuZn", "Brass", 0.3, "#ffd98a", 1200));
add("Cu", "Sn", R("CuSn", "Bronze", 0.3, "#ffc07a", 1100));
add("Au", "Hg", R("AuHg", "Gold amalgam", 0.3, "#ffe08a", 300));
add("Ra", "Cl", R("RaCl₂", "Radium chloride", 0.7, "#a8ffb0", 300));

// Compound follow-ups
add("H₂O", "Na", R("NaOH + H₂", "Water-metal explosion", 1, "#ffb066", 250, "explosion", "mixed"));
add("H₂O", "K", R("KOH + H₂", "Water-metal explosion", 1, "#ff9a4d", 250, "explosion", "mixed"));
add("H₂O", "Cs", R("CsOH + H₂", "Water-metal detonation", 1, "#ff7a3d", 200, "explosion", "mixed"));
add("H₂O", "NaCl", R("brine", "Salt dissolves in water", 0.2, "#9fe8ff", 273, "solution", "aqueous"));
add("H₂O", "CO₂", R("H₂CO₃", "Carbonic acid", 0.3, "#a8f0ff", 273, "solution", "aqueous"));
add("H₂O", "CaO", R("Ca(OH)₂", "Slaked lime", 0.8, "#fff6e0", 280, "solution", "aqueous"));
add("H₂O", "SO₂", R("H₂SO₃", "Sulfurous acid", 0.5, "#ffeeaa", 280, "solution", "aqueous"));
add("H₂O", "Al₂O₃", R("Al(OH)₃", "Aluminium hydroxide", 0.3, "#e8f4ff", 400, "precipitation", "aqueous"));
add("CH₄", "O", R("CO₂ + H₂O", "Combustion", 1, "#ff9d4d", 850, "combustion", "mixed"));
add("H₂S", "O", R("SO₂ + H₂O", "Oxidation", 0.8, "#ffd27a", 550, "oxidation", "mixed"));
add("NH₃", "HCl", R("NH₄Cl", "Ammonium chloride smoke", 0.6, "#ffffff", 280, "precipitation", "gas"));
add("NO", "O", R("NO₂", "Nitrogen dioxide", 0.5, "#ffbb88", 400, "oxidation", "gas"));

export function findReaction(a: string, b: string): Reaction | undefined {
  return table[key(a, b)];
}

export type ReactionOutcome =
  | { status: "reacts"; reaction: Reaction }
  | { status: "too-cold"; reaction: Reaction }
  | { status: "inert" };

/**
 * Chemistry gate for a colliding pair at a given temperature.
 * Curated reactions win; otherwise the periodic trends predict the product.
 */
export function resolveReaction(a: string, b: string, temperature: number): ReactionOutcome {
  const curated = findReaction(a, b);
  if (curated) {
    return temperature >= curated.activation
      ? { status: "reacts", reaction: curated }
      : { status: "too-cold", reaction: curated };
  }

  const bond = predictBond(a, b);
  if (!bond) return { status: "inert" };
  const reaction: Reaction = {
    formula: bond.formula,
    name: bond.name,
    energy: bond.energy,
    color: bond.color,
    activation: bond.activation,
    effect: bond.effect,
    phase: bond.phase,
  };
  return temperature >= bond.activation
    ? { status: "reacts", reaction }
    : { status: "too-cold", reaction };
}

export const NOBLE_SYMBOLS = ["He", "Ne", "Ar", "Kr", "Xe", "Rn", "Og"];
