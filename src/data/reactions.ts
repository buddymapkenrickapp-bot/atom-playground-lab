export type Reaction = {
  formula: string;
  name: string;
  energy: number; // 0..1 visual violence of the reaction
  color: string;
};

const R = (formula: string, name: string, energy = 0.4, color = "#e7f6ff"): Reaction => ({
  formula,
  name,
  energy,
  color,
});

function key(a: string, b: string) {
  return [a, b].sort().join("+");
}

const table: Record<string, Reaction> = {};
function add(a: string, b: string, r: Reaction) {
  table[key(a, b)] = r;
}

// Classic element + element chemistry
add("H", "O", R("H₂O", "Water", 0.7, "#7fd8ff"));
add("H", "Cl", R("HCl", "Hydrochloric acid", 0.6, "#d9ff9e"));
add("H", "F", R("HF", "Hydrofluoric acid", 0.7, "#fff09e"));
add("H", "S", R("H₂S", "Hydrogen sulfide", 0.4, "#ffe9a3"));
add("H", "N", R("NH₃", "Ammonia", 0.5, "#a8d8ff"));
add("H", "C", R("CH₄", "Methane", 0.5, "#c9ffd6"));
add("Na", "Cl", R("NaCl", "Table salt", 0.8, "#ffffff"));
add("K", "Cl", R("KCl", "Potassium chloride", 0.8, "#f2f2ff"));
add("Li", "Cl", R("LiCl", "Lithium chloride", 0.7, "#ffe4d6"));
add("Na", "O", R("Na₂O", "Sodium oxide", 0.7, "#ffd0b0"));
add("K", "O", R("K₂O", "Potassium oxide", 0.8, "#ffcf9c"));
add("Na", "H", R("NaH", "Sodium hydride", 0.5, "#ffd9c2"));
add("Mg", "O", R("MgO", "Magnesia", 0.9, "#ffffff"));
add("Ca", "O", R("CaO", "Quicklime", 0.7, "#fff4dd"));
add("Ba", "O", R("BaO", "Barium oxide", 0.6, "#ffe7f2"));
add("C", "O", R("CO₂", "Carbon dioxide", 0.6, "#cfe8ff"));
add("S", "O", R("SO₂", "Sulfur dioxide", 0.5, "#fff2a8"));
add("N", "O", R("NO₂", "Nitrogen dioxide", 0.5, "#ffbb88"));
add("Si", "O", R("SiO₂", "Quartz", 0.4, "#dff3ff"));
add("Fe", "O", R("Fe₂O₃", "Rust", 0.3, "#ff9a6a"));
add("Fe", "S", R("FeS", "Iron sulfide", 0.4, "#d3b58a"));
add("Al", "O", R("Al₂O₃", "Alumina", 0.8, "#eaf4ff"));
add("Ti", "O", R("TiO₂", "Titania", 0.5, "#ffffff"));
add("Cu", "O", R("CuO", "Copper oxide", 0.4, "#8fd6c4"));
add("Zn", "O", R("ZnO", "Zinc oxide", 0.4, "#e8f6ff"));
add("Zn", "Cl", R("ZnCl₂", "Zinc chloride", 0.5, "#e0ffef"));
add("Ni", "O", R("NiO", "Nickel oxide", 0.4, "#9fe0a8"));
add("Cr", "O", R("Cr₂O₃", "Chromia", 0.4, "#7fffbf"));
add("Pb", "S", R("PbS", "Galena", 0.3, "#b0b6c4"));
add("Ag", "Cl", R("AgCl", "Silver chloride", 0.4, "#f4f4f4"));
add("Ca", "C", R("CaC₂", "Calcium carbide", 0.5, "#dcd0a0"));
add("U", "F", R("UF₆", "Uranium hexafluoride", 0.8, "#b6ff7a"));
add("Pu", "O", R("PuO₂", "Plutonium dioxide", 0.9, "#ff7ba6"));
add("Th", "O", R("ThO₂", "Thoria", 0.6, "#ffa8c4"));
add("Cs", "O", R("Cs₂O", "Caesium oxide", 1, "#ffb066"));
add("Rb", "Cl", R("RbCl", "Rubidium chloride", 0.7, "#ffe0cc"));
add("Ca", "Cl", R("CaCl₂", "Calcium chloride", 0.7, "#fff8ea"));
add("Mg", "Cl", R("MgCl₂", "Magnesium chloride", 0.7, "#fff2f2"));
add("P", "O", R("P₄O₁₀", "Phosphorus pentoxide", 0.9, "#ffd7a1"));
add("B", "O", R("B₂O₃", "Boron oxide", 0.5, "#d6ffe9"));
add("W", "C", R("WC", "Tungsten carbide", 0.5, "#c0c8d8"));
add("Fe", "C", R("Fe₃C", "Cementite / steel", 0.4, "#c8ced8"));
add("Cu", "Zn", R("CuZn", "Brass", 0.3, "#ffd98a"));
add("Cu", "Sn", R("CuSn", "Bronze", 0.3, "#ffc07a"));
add("Au", "Hg", R("AuHg", "Gold amalgam", 0.3, "#ffe08a"));
add("Ra", "Cl", R("RaCl₂", "Radium chloride", 0.7, "#a8ffb0"));

// Compound follow-ups
add("H₂O", "Na", R("NaOH + H₂", "Violent caustic reaction", 1, "#ffb066"));
add("H₂O", "K", R("KOH + H₂", "Explosive caustic reaction", 1, "#ff9a4d"));
add("H₂O", "Cs", R("CsOH + H₂", "Detonation", 1, "#ff7a3d"));
add("H₂O", "NaCl", R("brine", "Saline solution", 0.2, "#9fe8ff"));
add("H₂O", "CO₂", R("H₂CO₃", "Carbonic acid", 0.3, "#a8f0ff"));
add("H₂O", "CaO", R("Ca(OH)₂", "Slaked lime", 0.8, "#fff6e0"));
add("H₂O", "SO₂", R("H₂SO₃", "Sulfurous acid", 0.5, "#ffeeaa"));
add("H₂O", "Al₂O₃", R("Al(OH)₃", "Aluminium hydroxide", 0.3, "#e8f4ff"));
add("CH₄", "O", R("CO₂ + H₂O", "Combustion", 1, "#ff9d4d"));
add("H₂S", "O", R("SO₂ + H₂O", "Oxidation", 0.8, "#ffd27a"));
add("NH₃", "HCl", R("NH₄Cl", "Ammonium chloride smoke", 0.6, "#ffffff"));

export function findReaction(a: string, b: string): Reaction | undefined {
  return table[key(a, b)];
}

export const NOBLE_SYMBOLS = ["He", "Ne", "Ar", "Kr", "Xe", "Rn", "Og"];
