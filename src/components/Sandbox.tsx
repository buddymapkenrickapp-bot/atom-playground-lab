import { useEffect, useRef } from "react";
import { BY_SYMBOL, byZ, type ElementInfo } from "@/data/elements";
import { NOBLE_SYMBOLS, resolveReaction } from "@/data/reactions";

/** Temperature (K) at which the confined plasma is hot enough to fuse nuclei. */
export const FUSION_IGNITION = 5000;

export type Controls = {
  gravity: number; // 0..2
  pressure: number; // 0..1
  fusion: boolean;
  temperature: number; // kelvin
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
  decayIn: number;
  flash: number;
};

type Spark = { x: number; y: number; vx: number; vy: number; life: number; color: string };

let nextId = 1;

function thermalSpeed(temperature: number) {
  return 20 + Math.sqrt(Math.max(0, temperature)) * 2.2;
}

function makeElementParticle(el: ElementInfo, x: number, y: number, temperature = 300): Particle {
  const s = thermalSpeed(temperature);
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
    radioactive: el.radioactive,
    decayIn: el.radioactive ? 3 + Math.random() * 7 : Infinity,
    flash: 1,
  };
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
      const dpr = Math.min(2, window.devicePixelRatio || 1);
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
      const n = Math.round(8 + energy * 26);
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
    };

    const reactorCenter = () => ({ x: size.current.w / 2, y: size.current.h / 2 });
    const reactorRadius = () => Math.min(size.current.w, size.current.h) * 0.22;

    const fuse = (a: Particle, b: Particle) => {
      const list = particles.current;
      const total = a.z + b.z;
      const x = (a.x + b.x) / 2;
      const y = (a.y + b.y) / 2;
      particles.current = list.filter((p) => p !== a && p !== b);
      if (total <= 118) {
        const el = byZ(total)!;
        const np = makeElementParticle(el, x, y, ctrl.current.temperature);
        np.flash = 1.6;
        particles.current.push(np);
        burst(x, y, 1, "#bff7ff");
        logRef.current(
          `FUSION · ${a.label} + ${b.label} → ${el.symbol} (${el.name}, Z=${total})`,
          "#8ce7ff",
        );
      } else {
        const half = Math.max(1, Math.round(total / 2));
        const p1 = byZ(half)!;
        const p2 = byZ(Math.max(1, total - half > 118 ? 118 : total - half))!;
        particles.current.push(makeElementParticle(p1, x - 20, y, ctrl.current.temperature), makeElementParticle(p2, x + 20, y, ctrl.current.temperature));
        burst(x, y, 1, "#ff9a4d");
        logRef.current(
          `FISSION · ${a.label} + ${b.label} exceeded Z=118 → ${p1.symbol} + ${p2.symbol}`,
          "#ffb066",
        );
      }
    };

    const coldNotes = new Map<string, number>();

    const react = (a: Particle, b: Particle) => {
      if (NOBLE_SYMBOLS.includes(a.label) || NOBLE_SYMBOLS.includes(b.label)) return false;
      const temperature = ctrl.current.temperature;
      const outcome = resolveReaction(a.label, b.label, temperature);
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
      const radioactive = a.radioactive || b.radioactive;
      particles.current = particles.current.filter((p) => p !== a && p !== b);
      particles.current.push({
        id: nextId++,
        label: rx.formula,
        name: rx.name,
        z: 0,
        color: rx.color,
        x,
        y,
        vx: (a.vx + b.vx) / 2,
        vy: (a.vy + b.vy) / 2,
        r: Math.min(34, Math.hypot(a.r, b.r)),
        radioactive,
        decayIn: radioactive ? 5 + Math.random() * 8 : Infinity,
        flash: 1 + rx.energy,
      });
      burst(x, y, rx.energy, rx.color);
      logRef.current(`${a.label} + ${b.label} → ${rx.formula} · ${rx.name}`, rx.color);
      return true;
    };


    const decay = (p: Particle) => {
      const x = p.x;
      const y = p.y;
      burst(x, y, 0.7, "#a8ff8a");
      if (p.z >= 3) {
        const daughter = byZ(p.z - 2)!;
        particles.current = particles.current.filter((q) => q !== p);
        const np = makeElementParticle(daughter, x, y, ctrl.current.temperature);
        np.flash = 1.2;
        particles.current.push(np, makeElementParticle(BY_SYMBOL["He"]!, x + 18, y - 12, ctrl.current.temperature));
        logRef.current(
          `α DECAY · ${p.label} → ${daughter.symbol} + He (alpha particle)`,
          "#a8ff8a",
        );
      } else {
        particles.current = particles.current.filter((q) => q !== p);
        logRef.current(`${p.label} decayed away`, "#a8ff8a");
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

      // physics
      for (const p of list) {
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
        // thermal agitation — hotter chamber means faster, more collisions
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
        if (p.decayIn !== Infinity) {
          p.decayIn -= dt * (1 + c.pressure * 2 + c.temperature / 4000);
        }

      }

      // decay
      for (const p of [...particles.current]) {
        if (p.decayIn !== Infinity && p.decayIn <= 0) decay(p);
      }

      // collisions + reactions
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
          // chemistry always gets the first say; nuclei only fuse in an ignited core
          if (react(a, b)) return schedule();
          if (
            c.fusion &&
            inReactor &&
            a.z > 0 &&
            b.z > 0 &&
            c.temperature >= FUSION_IGNITION
          ) {
            fuse(a, b);
            return schedule();
          }


          // elastic-ish bounce
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

      // sparks
      sparks.current = sparks.current.filter((s) => {
        s.life -= dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 120 * dt;
        s.vx *= 0.98;
        return s.life > 0;
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

      for (const p of particles.current) {
        const glow = 14 + p.flash * 26;
        ctx.save();
        ctx.shadowColor = p.color;
        ctx.shadowBlur = glow;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.92;
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
        ctx.font = `600 ${p.label.length > 3 ? 10 : 13}px ui-monospace, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.label, p.x, p.y);
      }
    };

    const schedule = () => {
      raf = requestAnimationFrame(frame);
    };

    const spawnAt = (symbol: string, x: number, y: number) => {
      const el = BY_SYMBOL[symbol];
      if (!el) return;
      if (particles.current.length > 90) particles.current.shift();
      particles.current.push(makeElementParticle(el, x, y, ctrl.current.temperature));
      logRef.current(
        `Placed ${el.name} (${el.symbol})${el.radioactive ? " · radioactive" : ""}`,
        el.color,
      );
    };

    handleRef.current = {
      spawn: (symbol, x, y) =>
        spawnAt(symbol, x ?? size.current.w * (0.25 + Math.random() * 0.5), y ?? size.current.h * 0.3),
      clear: () => {
        particles.current = [];
        sparks.current = [];
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
