import { ELEMENTS, type ElementInfo } from "@/data/elements";

export type IsotopeInfo = {
  symbol: string;
  element: string;
  mass: number;
  label: string;
  radioactive: boolean;
  halfLife?: string | undefined;
};

// Common stable isotopes plus scientifically important radioactive isotopes.
// Every element receives a representative isotope below; entries can be expanded
// without changing the palette or simulation APIs.
const MASS_NUMBERS: Record<string, number[]> = {
  H: [1, 2, 3], He: [3, 4], Li: [6, 7], Be: [9], B: [10, 11], C: [12, 13, 14],
  N: [14, 15], O: [16, 17, 18], F: [19], Ne: [20, 21, 22], Na: [23], Mg: [24, 25, 26],
  Al: [27], Si: [28, 29, 30], P: [31], S: [32, 33, 34, 36], Cl: [35, 37], Ar: [36, 38, 40],
  K: [39, 40, 41], Ca: [40, 42, 43, 44, 46, 48], Sc: [45], Ti: [46, 47, 48, 49, 50],
  V: [50, 51], Cr: [50, 52, 53, 54], Mn: [55], Fe: [54, 56, 57, 58], Co: [59],
  Ni: [58, 60, 61, 62, 64], Cu: [63, 65], Zn: [64, 66, 67, 68, 70], Ga: [69, 71],
  Ge: [70, 72, 73, 74, 76], As: [75], Se: [74, 76, 77, 78, 80, 82], Br: [79, 81],
  Kr: [78, 80, 82, 83, 84, 86], Rb: [85, 87], Sr: [84, 86, 87, 88], Y: [89], Zr: [90, 91, 92, 94, 96],
  Nb: [93], Mo: [92, 94, 95, 96, 97, 98, 100], Tc: [98, 99], Ru: [96, 98, 99, 100, 101, 102, 104],
  Rh: [103], Pd: [102, 104, 105, 106, 108, 110], Ag: [107, 109], Cd: [106, 108, 110, 111, 112, 113, 114, 116],
  In: [113, 115], Sn: [112, 114, 115, 116, 117, 118, 119, 120, 122, 124], Sb: [121, 123],
  Te: [120, 122, 123, 124, 125, 126, 128, 130], I: [127], Xe: [124, 126, 128, 129, 130, 131, 132, 134, 136],
    Cs: [133], Ba: [130, 132, 134, 135, 136, 137, 138], La: [138, 139], Ce: [136, 138, 140, 142],
  Pr: [141], Nd: [142, 143, 144, 145, 146, 148, 150], Pm: [145, 147], Sm: [144, 147, 148, 149, 150, 152, 154],
  Eu: [151, 153], Gd: [152, 154, 155, 156, 157, 158, 160], Tb: [159], Dy: [156, 158, 160, 161, 162, 163, 164],
  Ho: [165], Er: [162, 164, 166, 167, 168, 170], Tm: [169], Yb: [168, 170, 171, 172, 173, 174, 176],
  Lu: [175, 176], Hf: [174, 176, 177, 178, 179, 180], Ta: [180, 181], W: [180, 182, 183, 184, 186],
  Re: [185, 187], Os: [184, 186, 187, 188, 189, 190, 192], Ir: [191, 193], Pt: [190, 192, 194, 195, 196, 198],
  Au: [197], Hg: [196, 198, 199, 200, 201, 202, 204], Tl: [203, 205], Pb: [204, 206, 207, 208],
  Bi: [209], Po: [209, 210], At: [210, 211], Rn: [222], Fr: [223], Ra: [226], Ac: [227],
  Th: [232], Pa: [231], U: [234, 235, 238], Np: [237], Pu: [238, 239, 240, 241, 242, 244],
  Am: [241, 243], Cm: [242, 244, 245, 246, 247, 248], Bk: [247, 249], Cf: [249, 250, 251, 252],
  Es: [252], Fm: [257], Md: [258], No: [259], Lr: [266], Rf: [267], Db: [268], Sg: [269],
  Bh: [270], Hs: [277], Mt: [278], Ds: [281], Rg: [282], Cn: [285], Nh: [286], Fl: [289],
  Mc: [290], Lv: [293], Ts: [294], Og: [294],
};

const HALF_LIFE: Record<string, string> = {
  "H-3": "12.32 y", "C-14": "5730 y", "K-40": "1.248 Gy", "Tc-99": "211 ky",
  "I-131": "8.02 d", "Cs-137": "30.05 y", "Ra-226": "1600 y", "Th-232": "14.05 Gy",
  "U-235": "704 My", "U-238": "4.468 Gy", "Pu-239": "24.11 ky",
};

const stableUntil = 82;

export const ISOTOPES: IsotopeInfo[] = ELEMENTS.flatMap((element) => {
  const masses = MASS_NUMBERS[element.symbol] ?? [Math.round(element.z * 2.45)];
  return masses.map((mass) => {
    const isotopeKey = `${element.symbol}-${mass}`;
    const radioactive =
      element.radioactive || Boolean(HALF_LIFE[isotopeKey]) || (mass > stableUntil && element.z >= 83);
    return {
      symbol: element.symbol,
      element: element.name,
      mass,
      label: isotopeKey,
      radioactive,
      halfLife: HALF_LIFE[isotopeKey],
    };
  });
});

export const ISOTOPES_BY_LABEL: Record<string, IsotopeInfo> = Object.fromEntries(
  ISOTOPES.map((isotope) => [isotope.label, isotope]),
);

export function isotopeForLabel(label: string): IsotopeInfo | undefined {
  return ISOTOPES_BY_LABEL[label];
}

export function isotopeElement(label: string): ElementInfo | undefined {
  const isotope = isotopeForLabel(label);
  return isotope ? ELEMENTS.find((element) => element.symbol === isotope.symbol) : undefined;
}
