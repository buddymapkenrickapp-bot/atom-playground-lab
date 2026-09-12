export type ElementInfo = {
  z: number;
  symbol: string;
  name: string;
  category: Category;
  radioactive: boolean;
  color: string;
};

export type Category =
  | "alkali"
  | "alkaline"
  | "transition"
  | "post"
  | "metalloid"
  | "nonmetal"
  | "halogen"
  | "noble"
  | "lanthanide"
  | "actinide";

export const CATEGORY_COLORS: Record<Category, string> = {
  alkali: "#ff7a59",
  alkaline: "#ffb347",
  transition: "#6fd3ff",
  post: "#9aa7ff",
  metalloid: "#5fe3b0",
  nonmetal: "#8dff6a",
  halogen: "#ffe066",
  noble: "#c98dff",
  lanthanide: "#ff8dc7",
  actinide: "#ff5c8a",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  alkali: "Alkali metal",
  alkaline: "Alkaline earth",
  transition: "Transition metal",
  post: "Post-transition",
  metalloid: "Metalloid",
  nonmetal: "Reactive nonmetal",
  halogen: "Halogen",
  noble: "Noble gas",
  lanthanide: "Lanthanide",
  actinide: "Actinide",
};

const RAW =
  "H Hydrogen;He Helium;Li Lithium;Be Beryllium;B Boron;C Carbon;N Nitrogen;O Oxygen;F Fluorine;Ne Neon;" +
  "Na Sodium;Mg Magnesium;Al Aluminium;Si Silicon;P Phosphorus;S Sulfur;Cl Chlorine;Ar Argon;K Potassium;Ca Calcium;" +
  "Sc Scandium;Ti Titanium;V Vanadium;Cr Chromium;Mn Manganese;Fe Iron;Co Cobalt;Ni Nickel;Cu Copper;Zn Zinc;" +
  "Ga Gallium;Ge Germanium;As Arsenic;Se Selenium;Br Bromine;Kr Krypton;Rb Rubidium;Sr Strontium;Y Yttrium;Zr Zirconium;" +
  "Nb Niobium;Mo Molybdenum;Tc Technetium;Ru Ruthenium;Rh Rhodium;Pd Palladium;Ag Silver;Cd Cadmium;In Indium;Sn Tin;" +
  "Sb Antimony;Te Tellurium;I Iodine;Xe Xenon;Cs Caesium;Ba Barium;La Lanthanum;Ce Cerium;Pr Praseodymium;Nd Neodymium;" +
  "Pm Promethium;Sm Samarium;Eu Europium;Gd Gadolinium;Tb Terbium;Dy Dysprosium;Ho Holmium;Er Erbium;Tm Thulium;Yb Ytterbium;" +
  "Lu Lutetium;Hf Hafnium;Ta Tantalum;W Tungsten;Re Rhenium;Os Osmium;Ir Iridium;Pt Platinum;Au Gold;Hg Mercury;" +
  "Tl Thallium;Pb Lead;Bi Bismuth;Po Polonium;At Astatine;Rn Radon;Fr Francium;Ra Radium;Ac Actinium;Th Thorium;" +
  "Pa Protactinium;U Uranium;Np Neptunium;Pu Plutonium;Am Americium;Cm Curium;Bk Berkelium;Cf Californium;Es Einsteinium;Fm Fermium;" +
  "Md Mendelevium;No Nobelium;Lr Lawrencium;Rf Rutherfordium;Db Dubnium;Sg Seaborgium;Bh Bohrium;Hs Hassium;Mt Meitnerium;Ds Darmstadtium;" +
  "Rg Roentgenium;Cn Copernicium;Nh Nihonium;Fl Flerovium;Mc Moscovium;Lv Livermorium;Ts Tennessine;Og Oganesson";

const ALKALI = [3, 11, 19, 37, 55, 87];
const ALKALINE = [4, 12, 20, 38, 56, 88];
const METALLOID = [5, 14, 32, 33, 51, 52, 85];
const NONMETAL = [1, 6, 7, 8, 15, 16, 34];
const HALOGEN = [9, 17, 35, 53, 117];
const NOBLE = [2, 10, 18, 36, 54, 86, 118];
const POST = [13, 31, 49, 50, 81, 82, 83, 84, 112, 113, 114, 115, 116];

function categoryFor(z: number): Category {
  if (ALKALI.includes(z)) return "alkali";
  if (ALKALINE.includes(z)) return "alkaline";
  if (NOBLE.includes(z)) return "noble";
  if (HALOGEN.includes(z)) return "halogen";
  if (NONMETAL.includes(z)) return "nonmetal";
  if (METALLOID.includes(z)) return "metalloid";
  if (z >= 57 && z <= 71) return "lanthanide";
  if (z >= 89 && z <= 103) return "actinide";
  if (POST.includes(z)) return "post";
  return "transition";
}

function isRadioactive(z: number) {
  return z === 43 || z === 61 || z >= 84;
}

export const ELEMENTS: ElementInfo[] = RAW.split(";").map((entry, i) => {
  const [symbol, name] = entry.split(" ");
  const z = i + 1;
  const category = categoryFor(z);
  return {
    z,
    symbol,
    name,
    category,
    radioactive: isRadioactive(z),
    color: CATEGORY_COLORS[category],
  };
});

export const BY_SYMBOL: Record<string, ElementInfo> = Object.fromEntries(
  ELEMENTS.map((e) => [e.symbol, e]),
);

export function byZ(z: number): ElementInfo | undefined {
  return ELEMENTS[z - 1];
}
