import { useEffect, useRef } from "react";
import { BY_SYMBOL, byZ, type ElementInfo } from "@/data/elements";
import { canFormFromParticleSet, NOBLE_SYMBOLS, resolveReaction } from "@/data/reactions";
import { decayMode, defaultIsotopeForSymbol, isotopeForLabel } from "@/data/isotopes";

/** Temperature (K) at which the confined plasma is hot enough to fuse nuclei. */
export const FUSION_IGNITION = 5000;

export type Controls = {
  gravity: number; // 0..2
  pressure: number; // 0..1
  fusion: boolean;
  temperature: number; // kelvin
  decayTimer: number; // seconds; 0 pauses radioactive decay
};

export type Particle = {
  id: number;
  label: string;
  name: string;
  z: number; // 0 for compounds
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  radioactive: boolean;
  isotopeMass?: number | undefined;
  isotopeLabel?: string | undefined;
  decayIn: number;
  flash: number;
  phase: "solid" | "liquid" | "gas" | "aqueous";
};

type Spark = { x: number; y: number; vx: number; vy: number; life: number; color: string };
type Shockwave = { x: number; y: number; radius: number; life: number; color: string };

let nextId = 1;
const MAX_PARTICLES = 140;
const MAX_SPARKS = 260;
const MAX_SHOCKWAVES = 12;

function thermalSpeed(temperature: number) {
  return 20 + Math.sqrt(Math.max(0, temperature)) * 2.2;
}

function makeElementParticle(
  el: ElementInfo,
  x: number,
  y: number,
  temperature = 300,
  decaySeconds = 30,
  isotopeMass?: number,
  isotopeLabel?: string,
): Particle {
  const s = thermalSpeed(temperature);
  const defaultMass = defaultIsotopeForSymbol(el.symbol)?.mass;
  const actualMass = isotopeMass ?? defaultMass;
  const isotopeRadioactive = isotopeLabel ? isotopeForLabel(isotopeLabel)?.radioactive : undefined;
  return {
    id: nextId++,
    label: el.symbol,
    name: el.name,
    z: el.z,
    color: el.color,
    x,
    y,
    vx: (Math.random() - 0.5) * s,
    vy: (Math.random() - 0.5) * s,
    r: 12 + Math.min(14, Math.cbrt(el.z) * 3),
    radioactive: isotopeRadioactive ?? el.radioactive,
    isotopeMass: actualMass,
    isotopeLabel,
    decayIn: el.radioactive
      ? (decaySeconds > 0 ? decaySeconds * (0.7 + Math.random() * 0.6) : Infinity)
      : Infinity,
    flash: 1,
    phase: "solid",
  };
}

function makeEmissionParticle(
  label: string,
  name: string,
  color: string,
  x: number,
  y: number,
  vx: number,
  vy: number,
): Particle {
  return {
    id: nextId++,
    label,
    name,
    z: 0,
    color,
    x,
    y,
    vx,
    vy,
    r: 7,
    radioactive: false,
    isotopeLabel: label,
    decayIn: Infinity,
    flash: 1.8,
    phase: "gas",
  };
}

function waterPhase(temperature: number, pressure: number): Particle["phase"] {
  const boilingPoint = 373 + pressure * 700;
  if (temperature >= boilingPoint) return "gas";
  if (temperature < 273) return "solid";
  return "liquid";
}


export type SandboxHandle = {
  spawn: (symbol: string, x?: number, y?: number) => void;
  clear: () => void;
  count: () => number;
};

type Props = {
  selected: string | null;
  controls: Controls;
  onLog: (message: string, color: string) => void;
  handleRef: React.MutableRefObject<SandboxHandle | null>;
};

export function Sandbox({ selected, controls, onLog, handleRef }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const sparks = useRef<Spark[]>([]);
  const shockwaves = useRef<Shockwave[]>([]);
  const ctrl = useRef(controls);
  const sel = useRef(selected);
  const size = useRef({ w: 800, h: 480 });
  const logRef = useRef(onLog);

  ctrl.current = controls;
  sel.current = selected;
  logRef.current = onLog;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      size.current = { w, h };
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const burst = (x: number, y: number, energy: number, color: string) => {
      const available = Math.max(0, MAX_SPARKS - sparks.current.length);
      const n = Math.min(available, Math.round(8 + Math.min(energy, 2.4) * 26));
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 40 + Math.random() * 260 * energy;
        sparks.current.push({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 0.4 + Math.random() * 0.6,
          color,
        });
      }
      if (sparks.current.length > MAX_SPARKS) {
        sparks.current.splice(0, sparks.current.length - MAX_SPARKS);
      }
    };

    const shockwave = (x: number, y: number, energy: number, color: string) => {
      if (shockwaves.current.length >= MAX_SHOCKWAVES) shockwaves.current.shift();
      shockwaves.current.push({ x, y, radius: 10, life: 1, color });
      for (const particle of particles.current) {
        const dx = particle.x - x;
        const dy = particle.y - y;
        const distance = Math.hypot(dx, dy) || 1;
        const impulse = (energy * 420) / Math.max(40, distance);
        particle.vx += (dx / distance) * impulse;
        particle.vy += (dy / distance) * impulse;
      }
    };

    const nuclearBurst = (x: number, y: number) => {
      burst(x, y, 2.4, "#e9ffff");
      burst(x, y, 1.4, "#8ce7ff");
      shockwaves.current.push(
        { x, y, radius: 8, life: 1.2, color: "#ffffff" },
        { x, y, radius: 28, life: 0.9, color: "#8ce7ff" },
        { x, y, radius: 56, life: 0.65, color: "#ffb066" },
      );
      if (shockwaves.current.length > MAX_SHOCKWAVES) {
        shockwaves.current.splice(0, shockwaves.current.length - MAX_SHOCKWAVES);
      }
      shockwave(x, y, 2.2, "#bff7ff");
    };

    const addParticles = (...newParticles: Particle[]) => {
      particles.current.push(...newParticles);
      if (particles.current.length > MAX_PARTICLES) {
        particles.current.splice(0, particles.current.length - MAX_PARTICLES);
      }
    };

    const reactorCenter = () => ({ x: size.current.w / 2, y: size.current.h / 2 });
    const reactorRadius = () => Math.min(size.current.w, size.current.h) * 0.22;

    const fuse = (a: Particle, b: Particle) => {
      const list = particles.current;
      const total = a.z + b.z;
      const x = (a.x + b.x) / 2;
      const y = (a.y + b.y) / 2;
      particles.current = list.filter((p) => p !== a && p !== b);

      const deuteriumTritium =
        a.label === "H" &&
        b.label === "H" &&
        new Set([a.isotopeMass, b.isotopeMass]).size === 2 &&
        [a.isotopeMass, b.isotopeMass].includes(2) &&
        [a.isotopeMass, b.isotopeMass].includes(3);

      if (deuteriumTritium) {
        const helium = makeElementParticle(
          BY_SYMBOL["He"]!,
          x - 24,
          y,
          ctrl.current.temperature,
          ctrl.current.decayTimer,
          4,
          "He-4",
        );
        helium.flash = 2.6;
        const neutron: Particle = {
          id: nextId++,
          label: "n",
          name: "High-energy neutron",
          z: 0,
          color: "#fff1a8",
          x: x + 24,
          y,
          vx: 520,
          vy: (Math.random() - 0.5) * 180,
          r: 9,
          radioactive: false,
          isotopeLabel: "n",
          decayIn: Infinity,
          flash: 2.8,
          phase: "gas",
        };
        addParticles(helium, neutron);
        nuclearBurst(x, y);
        logRef.current(
          "FUSION · H-2 + H-3 → He-4 + n · 17.6 MeV released",
          "#ffffff",
        );
        return;
      }

      if (total <= 118) {
        const el = byZ(total)!;
        const np = makeElementParticle(
          el,
          x,
          y,
          ctrl.current.temperature,
          ctrl.current.decayTimer,
        );
        np.flash = 1.6;
        addParticles(np);
        burst(x, y, 1, "#bff7ff");
        logRef.current(
          `FUSION · ${a.label} + ${b.label} → ${el.symbol} (${el.name}, Z=${total})`,
          "#8ce7ff",
        );
      } else {
        const half = Math.max(1, Math.round(total / 2));
        const p1 = byZ(half)!;
        const p2 = byZ(Math.max(1, total - half > 118 ? 118 : total - half))!;
        addParticles(
          makeElementParticle(p1, x - 20, y, ctrl.current.temperature, ctrl.current.decayTimer),
          makeElementParticle(p2, x + 20, y, ctrl.current.temperature, ctrl.current.decayTimer),
        );
        burst(x, y, 1, "#ff9a4d");
        logRef.current(
          `FISSION · ${a.label} + ${b.label} exceeded Z=118 → ${p1.symbol} + ${p2.symbol}`,
          "#ffb066",
        );
      }
    };

    const fission = (heavy: Particle, neutron: Particle) => {
      const mass = heavy.isotopeMass;
      const x = (heavy.x + neutron.x) / 2;
      const y = (heavy.y + neutron.y) / 2;
      if (!mass || (heavy.label !== "U" && heavy.label !== "Pu")) return false;

      const uranium = heavy.label === "U" && mass === 235;
      const plutonium = heavy.label === "Pu" && mass === 239;
      if (!uranium && !plutonium) return false;

      particles.current = particles.current.filter((particle) => particle !== heavy && particle !== neutron);
      const products = uranium
        ? [{ symbol: "Ba", mass: 141 }, { symbol: "Kr", mass: 92 }, { neutrons: 3 }]
        : [{ symbol: "Xe", mass: 140 }, { symbol: "Zr", mass: 98 }, { neutrons: 2 }];

      for (const [index, product] of products.entries()) {
        if ("neutrons" in product) {
          for (let count = 0; count < product.neutrons; count++) {
            addParticles(
              makeEmissionParticle("n", "free neutron", "#fff1a8", x, y, 420 + count * 80, (count - 1) * 130),
            );
          }
        } else {
          const element = BY_SYMBOL[product.symbol];
          if (!element) continue;
          const fragment = makeElementParticle(
            element,
            x + (index === 0 ? -24 : 24),
            y,
            ctrl.current.temperature,
            ctrl.current.decayTimer,
            product.mass,
            `${product.symbol}-${product.mass}`,
          );
          fragment.vx += index === 0 ? -260 : 260;
          fragment.flash = 2.4;
          addParticles(fragment);
        }
      }

      nuclearBurst(x, y);
      logRef.current(
        uranium
          ? "FISSION · U-235 + n → Ba-141 + Kr-92 + 3n · ~200 MeV released"
          : "FISSION · Pu-239 + n → Xe-140 + Zr-98 + 2n · ~210 MeV released",
        "#ffb066",
      );
      return true;
    };

    const coldNotes = new Map<string, number>();

    const react = (a: Particle, b: Particle) => {
      if (NOBLE_SYMBOLS.includes(a.label) || NOBLE_SYMBOLS.includes(b.label)) return false;
      const temperature = ctrl.current.temperature;
      const outcome = resolveReaction(a.label, b.label, temperature, a.isotopeMass, b.isotopeMass);
      if (outcome.status === "inert") return false;
      if (outcome.status === "too-cold") {
        const k = [a.label, b.label].sort().join("+");
        const now = performance.now();
        if ((coldNotes.get(k) ?? 0) < now - 6000) {
          coldNotes.set(k, now);
          logRef.current(
            `${a.label} + ${b.label} · no reaction at ${Math.round(temperature)} K · needs ${outcome.reaction.activation} K`,
            "#7f8ea3",
          );
        }
        return false;
      }
      const rx = outcome.reaction;
      const x = (a.x + b.x) / 2;
      const y = (a.y + b.y) / 2;
      const localPool = [a, b, ...particles.current.filter((p) => p !== a && p !== b && Math.hypot(p.x - x, p.y - y) < 90)];
      if (!canFormFromParticleSet(localPool, rx.formula)) {
        return false;
      }
      const radioactive = a.radioactive || b.radioactive;
      particles.current = particles.current.filter((p) => p !== a && p !== b);

      const products = rx.formula.split(" + ");
      for (const [index, product] of products.entries()) {
        const phase =
          product === "H₂O"
            ? waterPhase(temperature, ctrl.current.pressure)
            : rx.phase === "mixed"
              ? product.includes("H₂") || product.includes("CO₂")
                ? "gas"
                : "liquid"
              : rx.phase === "aqueous"
                ? "aqueous"
                : rx.phase;

        addParticles({
          id: nextId++,
          label: product,
          name: products.length > 1 ? `${rx.name} product` : rx.name,
          z: 0,
          color: rx.color,
          x: x + (index - (products.length - 1) / 2) * 14,
          y,
          vx: (a.vx + b.vx) / 2 + (index ? 18 : -18),
          vy: (a.vy + b.vy) / 2 - (phase === "gas" ? 22 : 0),
          r: Math.min(34, Math.hypot(a.r, b.r)),
          radioactive,
          decayIn:
            radioactive && ctrl.current.decayTimer > 0
              ? ctrl.current.decayTimer * (0.7 + Math.random() * 0.6)
              : Infinity,
          flash: 1 + rx.energy,
          phase,
        });
      }

      burst(x, y, rx.energy, rx.color);
      if (rx.effect === "explosion" || (rx.effect === "combustion" && rx.energy >= 0.9)) {
        shockwave(x, y, rx.energy, rx.color);
      }
      logRef.current(`${a.label} + ${b.label} → ${rx.formula} · ${rx.name}`, rx.color);
      return true;
    };

    const decay = (p: Particle) => {
      const x = p.x;
      const y = p.y;
      const mass = p.isotopeMass;
      if (!mass || p.z < 1) {
        particles.current = particles.current.filter((q) => q !== p);
        return;
      }

      const mode = decayMode(p.label, mass);
      burst(x, y, mode === "alpha" ? 1.4 : 0.8, mode === "alpha" ? "#a8ff8a" : "#bff7ff");
      if (mode === "alpha" && p.z >= 3 && mass >= 4) {
        const daughter = byZ(p.z - 2);
        if (!daughter) return;
        particles.current = particles.current.filter((q) => q !== p);
        const np = makeElementParticle(
          daughter,
          x,
          y,
          ctrl.current.temperature,
          ctrl.current.decayTimer,
          mass - 4,
          `${daughter.symbol}-${mass - 4}`,
        );
        np.flash = 1.2;
        addParticles(
          np,
          makeElementParticle(
            BY_SYMBOL["He"]!,
            x + 18,
            y - 12,
            ctrl.current.temperature,
            ctrl.current.decayTimer,
            4,
            "He-4",
          ),
        );
        logRef.current(
          `α DECAY · ${p.isotopeLabel ?? `${p.label}-${mass}`} → ${daughter.symbol}-${mass - 4} + He-4`,
          "#a8ff8a",
        );
      } else if (mode === "beta-minus" && p.z < 118) {
        const daughter = byZ(p.z + 1);
        if (!daughter) return;
        particles.current = particles.current.filter((q) => q !== p);
        addParticles(
          makeElementParticle(daughter, x, y, ctrl.current.temperature, ctrl.current.decayTimer, mass, `${daughter.symbol}-${mass}`),
          makeEmissionParticle("β⁻", "electron", "#a8e7ff", x + 15, y, 380, -80),
          makeEmissionParticle("ν̄", "electron antineutrino", "#d8d8ff", x + 20, y + 10, 300, 60),
        );
        logRef.current(
          `β⁻ DECAY · ${p.isotopeLabel ?? `${p.label}-${mass}`} → ${daughter.symbol}-${mass} + e⁻ + ν̄`,
          "#a8e7ff",
        );
      } else if (mode === "beta-plus" && p.z > 1) {
        const daughter = byZ(p.z - 1);
        if (!daughter) return;
        particles.current = particles.current.filter((q) => q !== p);
        addParticles(
          makeElementParticle(daughter, x, y, ctrl.current.temperature, ctrl.current.decayTimer, mass, `${daughter.symbol}-${mass}`),
          makeEmissionParticle("β⁺", "positron", "#ffb0d0", x + 15, y, 340, -60),
          makeEmissionParticle("ν", "electron neutrino", "#d8d8ff", x + 20, y + 10, 280, 60),
        );
        logRef.current(
          `β⁺ DECAY · ${p.isotopeLabel ?? `${p.label}-${mass}`} → ${daughter.symbol}-${mass} + e⁺ + ν`,
          "#ffb0d0",
        );
      } else {
        particles.current = particles.current.filter((q) => q !== p);
        logRef.current(`${p.isotopeLabel ?? p.label} decayed away`, "#a8ff8a");
      }
    };

    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const { w, h } = size.current;
      const c = ctrl.current;
      const list = particles.current;
      const rc = reactorCenter();
      const rr = reactorRadius();

      for (const p of list) {
        if (p.label === "H₂O") p.phase = waterPhase(c.temperature, c.pressure);
        if (p.phase === "gas") p.vy -= 18 * dt;
        p.vy += c.gravity * 420 * dt;
        if (c.pressure > 0) {
          const dx = w / 2 - p.x;
          const dy = h / 2 - p.y;
          const d = Math.hypot(dx, dy) || 1;
          const f = c.pressure * 320 * dt;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
        if (c.fusion) {
          const dx = rc.x - p.x;
          const dy = rc.y - p.y;
          const d = Math.hypot(dx, dy) || 1;
          const f = 520 * dt;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }

        const kick = Math.sqrt(Math.max(0, c.temperature)) * 6 * dt;
        p.vx += (Math.random() - 0.5) * kick;
        p.vy += (Math.random() - 0.5) * kick;
        const damp = Math.exp(-0.9 * dt);
        p.vx *= damp;
        p.vy *= damp;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < p.r) (p.x = p.r), (p.vx = Math.abs(p.vx) * 0.7);
        if (p.x > w - p.r) (p.x = w - p.r), (p.vx = -Math.abs(p.vx) * 0.7);
        if (p.y < p.r) (p.y = p.r), (p.vy = Math.abs(p.vy) * 0.7);
        if (p.y > h - p.r) (p.y = h - p.r), (p.vy = -Math.abs(p.vy) * 0.7);
        p.flash = Math.max(0, p.flash - dt * 1.6);
        if (p.decayIn !== Infinity && c.decayTimer > 0) {
          p.decayIn -= dt * (1 + c.pressure * 2 + c.temperature / 4000) * (30 / Math.max(1, c.decayTimer));
        }
      }

      for (const p of [...particles.current]) {
        if (p.decayIn !== Infinity && p.decayIn <= 0) decay(p);
      }

      const cur = particles.current;
      for (let i = 0; i < cur.length; i++) {
        for (let j = i + 1; j < cur.length; j++) {
          const a = cur[i]!;
          const b = cur[j]!;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 0.001;
          const min = a.r + b.r;
          if (dist >= min) continue;

          const inReactor =
            Math.hypot(a.x - rc.x, a.y - rc.y) < rr && Math.hypot(b.x - rc.x, b.y - rc.y) < rr;
          const deuteriumTritium =
            a.label === "H" &&
            b.label === "H" &&
            new Set([a.isotopeMass, b.isotopeMass]).size === 2 &&
            [a.isotopeMass, b.isotopeMass].includes(2) &&
            [a.isotopeMass, b.isotopeMass].includes(3);
          const fissionPair =
            (a.label === "n" && (b.label === "U" || b.label === "Pu") && b.isotopeMass) ||
            (b.label === "n" && (a.label === "U" || a.label === "Pu") && a.isotopeMass);
          if (
            c.fusion &&
            inReactor &&
            fissionPair &&
            ((a.label === "U" && a.isotopeMass === 235) ||
              (b.label === "U" && b.isotopeMass === 235) ||
              (a.label === "Pu" && a.isotopeMass === 239) ||
              (b.label === "Pu" && b.isotopeMass === 239))
          ) {
            fission(a.label === "n" ? b : a, a.label === "n" ? a : b);
            return schedule();
          }
          if (c.fusion && inReactor && deuteriumTritium && c.temperature >= FUSION_IGNITION) {
            fuse(a, b);
            return schedule();
          }
          if (react(a, b)) return schedule();
          if (c.fusion && inReactor && a.z > 0 && b.z > 0 && c.temperature >= FUSION_IGNITION) {
            fuse(a, b);
            return schedule();
          }

          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = min - dist;
          a.x -= nx * overlap * 0.5;
          a.y -= ny * overlap * 0.5;
          b.x += nx * overlap * 0.5;
          b.y += ny * overlap * 0.5;
          const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rel < 0) {
            const imp = rel * 0.9;
            a.vx += nx * imp;
            a.vy += ny * imp;
            b.vx -= nx * imp;
            b.vy -= ny * imp;
          }
        }
      }

      sparks.current = sparks.current.filter((s) => {
        s.life -= dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 120 * dt;
        s.vx *= 0.98;
        return s.life > 0;
      });

      shockwaves.current = shockwaves.current.filter((wave) => {
        wave.life -= dt * 2.4;
        wave.radius += (220 + wave.radius) * dt;
        return wave.life > 0;
      });

      draw();
      schedule();
    };

    const draw = () => {
      const { w, h } = size.current;
      const c = ctrl.current;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#05060a";
      ctx.fillRect(0, 0, w, h);

      // faint grid
      ctx.strokeStyle = "rgba(120,200,255,0.05)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // heat glow across the chamber
      if (c.temperature > 400) {
        const heat = Math.min(1, (c.temperature - 400) / 5000);
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h));
        g.addColorStop(0, `rgba(255,120,60,${0.05 + heat * 0.16})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      if (c.pressure > 0) {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 1.4);
        g.addColorStop(0, `rgba(255,150,90,${0.02 + c.pressure * 0.12})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      if (c.fusion) {
        const ignited = c.temperature >= FUSION_IGNITION;
        const ring = ignited ? "140,231,255" : "127,142,163";
        const rc = { x: w / 2, y: h / 2 };
        const rr = Math.min(w, h) * 0.22;
        const t = performance.now() / 600;
        ctx.save();
        ctx.strokeStyle = `rgba(${ring},0.7)`;
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 8]);
        ctx.lineDashOffset = -t * 20;
        ctx.beginPath();
        ctx.arc(rc.x, rc.y, rr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        const g = ctx.createRadialGradient(rc.x, rc.y, 0, rc.x, rc.y, rr);
        g.addColorStop(0, `rgba(${ring},${ignited ? 0.18 : 0.06})`);
        g.addColorStop(1, `rgba(${ring},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();

        ctx.arc(rc.x, rc.y, rr, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (c.gravity > 0.05) {
        ctx.fillStyle = `rgba(154,167,255,${Math.min(0.16, c.gravity * 0.09)})`;
        ctx.fillRect(0, h - 6 - c.gravity * 10, w, 6 + c.gravity * 10);
      }

      for (const s of sparks.current) {
        ctx.globalAlpha = Math.max(0, Math.min(1, s.life));
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (const wave of shockwaves.current) {
        ctx.globalAlpha = Math.max(0, wave.life);
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      for (const p of particles.current) {
        const glow = 14 + p.flash * 26;
        ctx.save();
        ctx.shadowColor = p.color;
        ctx.shadowBlur = glow;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.phase === "gas" ? 0.45 : p.phase === "aqueous" ? 0.72 : 0.92;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (p.radioactive) {
          const t = performance.now() / 300;
          ctx.strokeStyle = `rgba(168,255,138,${0.35 + 0.35 * Math.sin(t)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r + 5, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = "#05060a";
        const displayLabel = p.isotopeLabel ?? p.label;
        ctx.font = `600 ${displayLabel.length > 3 ? 10 : 13}px ui-monospace, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(displayLabel, p.x, p.y);
      }
    };

    const schedule = () => {
      raf = requestAnimationFrame(frame);
    };

    const spawnAt = (selection: string, x: number, y: number) => {
      const isotope = isotopeForLabel(selection);
      const symbol = isotope?.symbol ?? selection;
      const el = BY_SYMBOL[symbol];
      if (!el) return;
      if (particles.current.length > 90) particles.current.shift();
      addParticles(
        makeElementParticle(
          el,
          x,
          y,
          ctrl.current.temperature,
          ctrl.current.decayTimer,
          isotope?.mass,
          isotope?.label,
        ),
      );
      logRef.current(
        `Placed ${isotope?.label ?? el.name} (${el.name})${el.radioactive ? " · radioactive" : ""}`,
        el.color,
      );
    };

    handleRef.current = {
      spawn: (symbol, x, y) =>
        spawnAt(symbol, x ?? size.current.w * (0.25 + Math.random() * 0.5), y ?? size.current.h * 0.3),
      clear: () => {
        particles.current = [];
        sparks.current = [];
        shockwaves.current = [];
        logRef.current("Chamber evacuated", "#8ce7ff");
      },
      count: () => particles.current.length,
    };

    const onClick = (e: MouseEvent) => {
      if (!sel.current) return;
      const rect = canvas.getBoundingClientRect();
      spawnAt(sel.current, e.clientX - rect.left, e.clientY - rect.top);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const sym = e.dataTransfer?.getData("text/plain");
      if (!sym) return;
      const rect = canvas.getBoundingClientRect();
      spawnAt(sym, e.clientX - rect.left, e.clientY - rect.top);
    };
    const onDragOver = (e: DragEvent) => e.preventDefault();

    canvas.addEventListener("click", onClick);
    canvas.addEventListener("drop", onDrop);
    canvas.addEventListener("dragover", onDragOver);
    schedule();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("drop", onDrop);
      canvas.removeEventListener("dragover", onDragOver);
      handleRef.current = null;
    };
  }, [handleRef]);

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden rounded-xl border border-border bg-[#05060a]">
      <canvas ref={canvasRef} className="block h-full w-full cursor-crosshair" />
    </div>
  );
}
