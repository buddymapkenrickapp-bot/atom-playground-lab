import { BY_SYMBOL, type Category, type ElementInfo } from "@/data/elements";

/** Pauling electronegativity for the elements we model; sensible fallbacks elsewhere. */
const EN: Record<string, number> = {
  H: 2.2, He: 0, Li: 0.98, Be: 1.57, B: 2.04, C: 2.55, N: 3.04, O: 3.44, F: 3.98, Ne: 0,
  Na: 0.93, Mg: 1.31, Al: 1.61, Si: 1.9, P: 2.19, S: 2.58, Cl: 3.16, Ar: 0, K: 0.82, Ca: 1,
  Sc: 1.36, Ti: 1.54, V: 1.63, Cr: 1.66, Mn: 1.55, Fe: 1.83, Co: 1.88, Ni: 1.91, Cu: 1.9, Zn: 1.65,
  Ga: 1.81, Ge: 2.01, As: 2.18, Se: 2.55, Br: 2.96, Kr: 0, Rb: 0.82, Sr: 0.95, Y: 1.22, Zr: 1.33,
  Nb: 1.6, Mo: 2.16, Tc: 1.9, Ru: 2.2, Rh: 2.28, Pd: 2.2, Ag: 1.93, Cd: 1.69, In: 1.78, Sn: 1.96,
  Sb: 2.05, Te: 2.1, I: 2.66, Xe: 0, Cs: 0.79, Ba: 0.89, La: 1.1, Hf: 1.3, Ta: 1.5, W: 2.36,
  Re: 1.9, Os: 2.2, Ir: 2.2, Pt: 2.28, Au: 2.54, Hg: 2, Tl: 1.62, Pb: 2.33, Bi: 2.02, Po: 2,
  At: 2.2, Rn: 0, Fr: 0.7, Ra: 0.9, Ac: 1.1, Th: 1.3, Pa: 1.5, U: 1.38, Np: 1.36, Pu: 1.28,
};

/** Typical bonding capacity (absolute valence) used to cross-multiply formulas. */
const VALENCE: Record<string, number> = {
  H: 1, Li: 1, Na: 1, K: 1, Rb: 1, Cs: 1, Fr: 1, Ag: 1,
  Be: 2, Mg: 2, Ca: 2, Sr: 2, Ba: 2, Ra: 2, Zn: 2, Cd: 2, Hg: 2, Cu: 2, Ni: 2, Co: 2, Mn: 2,
  Fe: 3, Al: 3, B: 3, Ga: 3, In: 3, Sc: 3, Y: 3, La: 3, Ac: 3, Cr: 3, Bi: 3, Sb: 3, As: 3, N: 3, P: 3,
  C: 4, Si: 4, Ge: 4, Sn: 4, Pb: 4, Ti: 4, Zr: 4, Hf: 4, Th: 4, Pt: 4,
  O: 2, S: 2, Se: 2, Te: 2, Po: 2,
  F: 1, Cl: 1, Br: 1, I: 1, At: 1, Ts: 1,
  V: 5, Nb: 5, Ta: 5, Pa: 5, U: 6, Np: 5, Pu: 4, Mo: 6, W: 6, Re: 7, Os: 4, Ir: 3, Ru: 4, Rh: 3, Pd: 2,
  Tl: 1, Tc: 7, Au: 3, Pm: 3, Nd: 3, Sm: 3, Eu: 3, Gd: 3, Ce: 3,
};

const METAL_CATEGORIES: Category[] = [
  "alkali",
  "alkaline",
  "transition",
  "post",
  "lanthanide",
  "actinide",
];

export function electronegativity(el: ElementInfo) {
  if (EN[el.symbol] !== undefined) return EN[el.symbol]!;
  if (el.category === "noble") return 0;
  if (METAL_CATEGORIES.includes(el.category)) return 1.3;
  return 2.2;
}

export function valence(el: ElementInfo) {
  return VALENCE[el.symbol] ?? (METAL_CATEGORIES.includes(el.category) ? 3 : 2);
}

export function isMetal(el: ElementInfo) {
  return METAL_CATEGORIES.includes(el.category);
}

export function isInert(el: ElementInfo) {
  return el.category === "noble";
}

/** How eagerly an element gives up / grabs electrons — drives activation temperature. */
export function reactivity(el: ElementInfo) {
  if (isInert(el)) return 0;
  const en = electronegativity(el);
  if (isMetal(el)) {
    // low electronegativity metals are the most eager (alkali, alkaline earth)
    return Math.max(0.05, Math.min(1, (2.6 - en) / 1.9));
  }
  return Math.max(0.05, Math.min(1, (en - 1.6) / 2.4));
}

const SUBS = "₀₁₂₃₄₅₆₇₈₉";
export function sub(n: number) {
  if (n <= 1) return "";
  return String(n)
    .split("")
    .map((d) => SUBS[Number(d)])
    .join("");
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Cross valences to get whole-number stoichiometry, e.g. Al + O -> Al₂O₃. */
export function stoichiometry(a: ElementInfo, b: ElementInfo) {
  const va = valence(a);
  const vb = valence(b);
  const g = gcd(va, vb) || 1;
  return { na: vb / g, nb: va / g };
}

export type PredictedBond = {
  formula: string;
  name: string;
  /** kind of bonding that formed */
  kind: "ionic" | "covalent" | "alloy";
  /** 0..1 visual violence */
  energy: number;
  color: string;
  /** kelvin needed before the pair will react at all */
  activation: number;
};

function mix(colorA: string, colorB: string) {
  const parse = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  try {
    const [r1, g1, b1] = parse(colorA) as [number, number, number];
    const [r2, g2, b2] = parse(colorB) as [number, number, number];
    const to = (n: number) => Math.round(n).toString(16).padStart(2, "0");
    return `#${to((r1 + r2) / 2)}${to((g1 + g2) / 2)}${to((b1 + b2) / 2)}`;
  } catch {
    return colorA;
  }
}

/**
 * Chemistry-first prediction for any element pair. Returns undefined when the
 * pair simply does not bond (noble gases, two unreactive metals, same element).
 */
export function predictBond(symA: string, symB: string): PredictedBond | undefined {
  const a = BY_SYMBOL[symA];
  const b = BY_SYMBOL[symB];
  if (!a || !b) return undefined;
  if (isInert(a) || isInert(b)) return undefined;

  const enA = electronegativity(a);
  const enB = electronegativity(b);
  const diff = Math.abs(enA - enB);
  const metalA = isMetal(a);
  const metalB = isMetal(b);
  const react = Math.min(reactivity(a), reactivity(b));

  if (a.symbol === b.symbol) return undefined;

  // metal + metal: no electron transfer possible, only a solid solution (alloy)
  if (metalA && metalB) {
    return {
      formula: `${a.symbol}${b.symbol}`,
      name: `${a.name}–${b.name} alloy`,
      kind: "alloy",
      energy: 0.15,
      color: mix(a.color, b.color),
      activation: 900,
    };
  }

  // nonmetal + nonmetal with almost identical electronegativity: no driving force
  if (!metalA && !metalB && diff < 0.25) return undefined;

  // order the formula: less electronegative partner first, like real formulas
  const [first, second] = enA <= enB ? [a, b] : [b, a];
  const { na, nb } = stoichiometry(first, second);
  const formula = `${first.symbol}${sub(na)}${second.symbol}${sub(nb)}`;
  const ionic = diff >= 1.7;

  return {
    formula,
    name: ionic
      ? `${first.name} ${second.name.toLowerCase()}ide (ionic)`
      : `${first.name}–${second.name.toLowerCase()} compound (covalent)`,
    kind: ionic ? "ionic" : "covalent",
    energy: Math.max(0.15, Math.min(1, diff / 3.2 + react * 0.4)),
    color: mix(first.color, second.color),
    // eager pairs ignite near room temperature, sluggish ones need real heat
    activation: Math.round(280 + (1 - react) * 900 + (ionic ? 0 : 220)),
  };
}
