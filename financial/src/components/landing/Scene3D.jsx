import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { sceneStore } from "./sceneStore";

/* ==========================================================================
   Cena 3D fixa da landing page.

   Um único <Canvas> fica fixo atrás do conteúdo. O grupo de objetos "persegue"
   o âncora DOM mais próximo do centro da viewport (`[data-scene-anchor]`),
   então se desloca/escala de forma fluida conforme o usuário rola a página.
   Dentro da seção "Como funciona", o objeto faz morph:
   cartão → pilha de moedas → barras de crescimento.
   ========================================================================== */

const MINT = "#b6ffe2";
const MINT_DEEP = "#8df3ca";
const FOREST = "#0d7a57";

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const damp = THREE.MathUtils.damp;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ---------- Texturas procedurais (sem assets externos) ---------- */

function makeCardTexture() {
  const W = 1024;
  const H = 640;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d");
  const R = 56;

  g.beginPath();
  g.roundRect(0, 0, W, H, R);
  g.clip();

  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#2c313d");
  bg.addColorStop(1, "#171a22");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  // Arcos concêntricos discretos
  g.strokeStyle = "rgba(182,255,226,0.07)";
  g.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    g.beginPath();
    g.arc(W - 40, 40, 110 + i * 62, 0, Math.PI * 2);
    g.stroke();
  }

  // Borda
  g.strokeStyle = "rgba(255,255,255,0.14)";
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(1.5, 1.5, W - 3, H - 3, R);
  g.stroke();

  // Wordmark
  g.textBaseline = "alphabetic";
  g.font = '800 58px Inter, "Geist Variable", system-ui, sans-serif';
  g.fillStyle = "#ffffff";
  g.fillText("Me", 72, 130);
  const meW = g.measureText("Me").width;
  g.fillStyle = MINT;
  g.fillText("Finance", 72 + meW, 130);

  // Chip
  g.fillStyle = MINT;
  g.beginPath();
  g.roundRect(72, 232, 132, 100, 20);
  g.fill();
  g.strokeStyle = "rgba(13,122,87,0.55)";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(72, 282);
  g.lineTo(204, 282);
  g.moveTo(138, 232);
  g.lineTo(138, 332);
  g.stroke();

  // Contactless
  g.strokeStyle = "rgba(255,255,255,0.75)";
  g.lineWidth = 6;
  g.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.arc(W - 140, 120, 22 + i * 18, -Math.PI / 3, Math.PI / 3);
    g.stroke();
  }

  // Número
  g.font = '500 54px ui-monospace, "SF Mono", Consolas, monospace';
  g.fillStyle = "rgba(255,255,255,0.92)";
  g.fillText("••••   ••••   ••••   2026", 72, 430);

  // Saldo
  g.font = '600 24px Inter, system-ui, sans-serif';
  g.fillStyle = "rgba(255,255,255,0.5)";
  g.fillText("SALDO DO MÊS", 72, 515);
  g.font = '800 54px Inter, "Geist Variable", system-ui, sans-serif';
  g.fillStyle = "#ffffff";
  g.fillText("R$ 4.280,00", 72, 578);

  // Círculos sobrepostos
  g.fillStyle = "rgba(182,255,226,0.9)";
  g.beginPath();
  g.arc(W - 150, H - 90, 46, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.28)";
  g.beginPath();
  g.arc(W - 100, H - 90, 46, 0, Math.PI * 2);
  g.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeCoinTexture() {
  const S = 512;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const g = canvas.getContext("2d");
  const c = S / 2;

  g.fillStyle = MINT_DEEP;
  g.fillRect(0, 0, S, S);

  g.strokeStyle = "rgba(13,122,87,0.5)";
  g.lineWidth = 10;
  g.beginPath();
  g.arc(c, c, c - 36, 0, Math.PI * 2);
  g.stroke();

  g.setLineDash([2, 22]);
  g.lineCap = "round";
  g.lineWidth = 8;
  g.beginPath();
  g.arc(c, c, c - 70, 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([]);

  g.fillStyle = "rgba(255,255,255,0.18)";
  g.beginPath();
  g.arc(c, c, c - 110, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = FOREST;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = '800 170px Inter, "Geist Variable", system-ui, sans-serif';
  g.fillText("R$", c, c + 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function useCoinAssets() {
  return useMemo(() => {
    const topTex = makeCoinTexture();
    const side = new THREE.MeshStandardMaterial({
      color: MINT_DEEP,
      metalness: 0.9,
      roughness: 0.28,
    });
    const face = new THREE.MeshStandardMaterial({
      map: topTex,
      metalness: 0.55,
      roughness: 0.32,
    });
    const geometry = new THREE.CylinderGeometry(1, 1, 0.16, 64);
    return { geometry, materials: [side, face, face] };
  }, []);
}

/* ---------- Formas ---------- */

function CardShape({ shared }) {
  const group = useRef();
  const tex = useMemo(makeCardTexture, []);

  useFrame((_, dt) => {
    const s = shared.current;
    const w = s.weights.card;
    const g = group.current;
    g.visible = w > 0.01;
    if (!g.visible) return;
    g.scale.setScalar(Math.max(w, 0.0001));
    g.rotation.y = damp(g.rotation.y, -0.45 + Math.sin(s.scroll * 0.0022) * 0.5 + s.px * 0.4, 5, dt);
    g.rotation.x = damp(g.rotation.x, 0.14 - s.py * 0.28 + Math.sin(s.t * 0.7) * 0.03, 5, dt);
    g.rotation.z = damp(g.rotation.z, 0.1 + Math.sin(s.t * 0.5) * 0.02, 5, dt);
  });

  return (
    <group ref={group}>
      <RoundedBox args={[3.2, 2, 0.1]} radius={0.12} smoothness={6}>
        <meshPhysicalMaterial
          color="#1b1e27"
          metalness={0.55}
          roughness={0.35}
          clearcoat={1}
          clearcoatRoughness={0.25}
        />
      </RoundedBox>
      <mesh position={[0, 0, 0.056]}>
        <planeGeometry args={[3.2, 2]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.35, -0.056]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[3.2, 0.42]} />
        <meshBasicMaterial color="#0b0d12" toneMapped={false} />
      </mesh>
    </group>
  );
}

const STACK_COUNT = 6;

function StackShape({ shared, assets }) {
  const group = useRef();
  const coins = useRef([]);

  useFrame((_, dt) => {
    const s = shared.current;
    const w = s.weights.stack;
    const g = group.current;
    g.visible = w > 0.01;
    if (!g.visible) return;
    g.rotation.y = damp(g.rotation.y, s.scroll * 0.0035 + s.t * 0.25 + s.px * 0.3, 5, dt);
    g.rotation.x = damp(g.rotation.x, 0.2 - s.py * 0.2, 5, dt);

    coins.current.forEach((m, i) => {
      if (!m) return;
      const k = smooth(i * 0.07, i * 0.07 + 0.6, w);
      m.visible = k > 0.005;
      m.scale.setScalar(Math.max(k, 0.0001));
      m.position.y = -0.55 + i * 0.2 + (1 - k) * 1.8;
      m.rotation.y = i * 0.55 + s.scroll * 0.0016 * (1 + i * 0.12);
    });
  });

  return (
    <group ref={group}>
      {Array.from({ length: STACK_COUNT }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => (coins.current[i] = el)}
          geometry={assets.geometry}
          material={assets.materials}
          position={[Math.sin(i * 2.1) * 0.05, -0.55 + i * 0.2, Math.cos(i * 1.7) * 0.05]}
        />
      ))}
      <mesh position={[0, -0.7, 0]}>
        <cylinderGeometry args={[1.25, 1.25, 0.06, 64]} />
        <meshStandardMaterial color="#23262f" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

const BAR_HEIGHTS = [0.7, 1.05, 0.9, 1.5, 1.25, 1.95];

function BarsShape({ shared }) {
  const group = useRef();
  const bars = useRef([]);

  useFrame((_, dt) => {
    const s = shared.current;
    const w = s.weights.bars;
    const g = group.current;
    g.visible = w > 0.01;
    if (!g.visible) return;
    g.rotation.y = damp(g.rotation.y, -0.55 + Math.sin(s.scroll * 0.002) * 0.3 + s.px * 0.3, 5, dt);
    g.rotation.x = damp(g.rotation.x, 0.16 - s.py * 0.2, 5, dt);

    bars.current.forEach((m, i) => {
      if (!m) return;
      const k = smooth(i * 0.09, i * 0.09 + 0.55, w);
      const h = Math.max(BAR_HEIGHTS[i] * k, 0.0001);
      m.scale.y = h;
      m.position.y = -1 + h / 2;
    });
  });

  return (
    <group ref={group}>
      {BAR_HEIGHTS.map((_, i) => {
        const highlight = i >= BAR_HEIGHTS.length - 2;
        return (
          <RoundedBox
            key={i}
            ref={(el) => (bars.current[i] = el)}
            args={[0.36, 1, 0.36]}
            radius={0.07}
            smoothness={4}
            position={[(i - 2.5) * 0.5, -1, 0]}
          >
            <meshStandardMaterial
              color={highlight ? MINT : "#3e4351"}
              metalness={highlight ? 0.25 : 0.45}
              roughness={highlight ? 0.3 : 0.32}
            />
          </RoundedBox>
        );
      })}
      <RoundedBox args={[3.3, 0.07, 0.8]} radius={0.03} position={[0, -1.04, 0]}>
        <meshStandardMaterial color="#23262f" metalness={0.5} roughness={0.4} />
      </RoundedBox>
    </group>
  );
}

const ORBIT = Array.from({ length: 10 }).map((_, i) => ({
  angle: (i / 10) * Math.PI * 2 + (i % 3) * 0.2,
  radius: 1.85 + ((i * 7) % 5) * 0.12,
  y: (((i * 37) % 10) / 10 - 0.5) * 2.2,
  size: 0.15 + ((i * 13) % 5) * 0.03,
  speed: 0.7 + (i % 4) * 0.2,
}));

function OrbitShape({ shared, assets }) {
  const group = useRef();
  const coins = useRef([]);

  useFrame(() => {
    const s = shared.current;
    const w = s.weights.orbit;
    const g = group.current;
    g.visible = w > 0.01;
    if (!g.visible) return;
    g.rotation.y = s.t * 0.28 + s.scroll * 0.003;
    coins.current.forEach((m, i) => {
      if (!m) return;
      const o = ORBIT[i];
      const k = smooth(i * 0.04, i * 0.04 + 0.6, w);
      m.scale.setScalar(Math.max(o.size * k, 0.0001));
      m.position.y = o.y + Math.sin(s.t * 0.9 + i) * 0.1;
      m.rotation.x = s.t * o.speed + i;
      m.rotation.z = s.t * o.speed * 0.6;
    });
  });

  return (
    <group ref={group}>
      {ORBIT.map((o, i) => (
        <mesh
          key={i}
          ref={(el) => (coins.current[i] = el)}
          geometry={assets.geometry}
          material={assets.materials}
          position={[Math.cos(o.angle) * o.radius, o.y, Math.sin(o.angle) * o.radius]}
        />
      ))}
    </group>
  );
}

/* ---------- Rig: segue âncoras DOM e controla pesos de cada forma ---------- */

function targetWeights(mode, steps) {
  if (mode === "steps") {
    const toStack = smooth(0.25, 0.4, steps);
    const toBars = smooth(0.62, 0.75, steps);
    return {
      card: 1 - toStack,
      stack: toStack * (1 - toBars),
      bars: toBars,
      orbit: toStack * (1 - toBars),
    };
  }
  if (mode === "cta") return { card: 0, stack: 1, bars: 0, orbit: 1 };
  return { card: 1, stack: 0, bars: 0, orbit: 1 };
}

function Rig({ shared }) {
  const root = useRef();
  const assets = useCoinAssets();
  const reduce = useMemo(prefersReducedMotion, []);
  const pos = useRef({ x: 0, y: 0, s: 0 });

  useEffect(() => {
    const onMove = (e) => {
      shared.current.tx = (e.clientX / window.innerWidth) * 2 - 1;
      shared.current.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [shared]);

  useFrame((state, dt) => {
    const s = shared.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cam = state.camera;
    const worldH = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.position.z;
    const ppu = vh / worldH;

    s.t = reduce ? 0 : state.clock.elapsedTime;
    s.scroll = window.scrollY;
    s.px = damp(s.px, reduce ? 0 : s.tx, 4, dt);
    s.py = damp(s.py, reduce ? 0 : s.ty, 4, dt);

    // Âncora mais próxima do centro da viewport
    let best = null;
    let bestD = Infinity;
    document.querySelectorAll("[data-scene-anchor]").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const cy = r.top + r.height / 2;
      const d = Math.abs(cy - vh / 2) / vh;
      if (d < bestD) {
        bestD = d;
        best = { r, cy, mode: el.getAttribute("data-scene-anchor") };
      }
    });

    let tx = pos.current.x;
    let ty = pos.current.y;
    let ts = 0;
    let mode = "hero";
    if (best) {
      const cx = best.r.left + best.r.width / 2;
      tx = (cx - vw / 2) / ppu;
      ty = -(best.cy - vh / 2) / ppu;
      const size = Math.min(best.r.width, best.r.height * 1.1) / ppu;
      const vis = 1 - smooth(0.4, 0.95, bestD);
      ts = (size / 3.6) * vis;
      mode = best.mode;
    }

    // Primeiro frame: posiciona sem animar
    if (pos.current.s === 0 && ts > 0 && pos.current.x === 0 && pos.current.y === 0) {
      pos.current.x = tx;
      pos.current.y = ty;
    }

    pos.current.x = damp(pos.current.x, tx, 7, dt);
    pos.current.y = damp(pos.current.y, ty, 7, dt);
    pos.current.s = damp(pos.current.s, ts, 6, dt);

    const bob = reduce ? 0 : Math.sin(s.t * 0.9) * 0.06;
    root.current.position.set(pos.current.x + s.px * 0.12, pos.current.y + bob, 0);
    root.current.scale.setScalar(Math.max(pos.current.s, 0.0001));
    root.current.visible = pos.current.s > 0.005;

    // Pesos de cada forma
    const t = targetWeights(mode, sceneStore.steps.get());
    const w = s.weights;
    w.card = damp(w.card, t.card, 6, dt);
    w.stack = damp(w.stack, t.stack, 6, dt);
    w.bars = damp(w.bars, t.bars, 6, dt);
    w.orbit = damp(w.orbit, t.orbit, 6, dt);
  });

  return (
    <group ref={root}>
      <CardShape shared={shared} />
      <StackShape shared={shared} assets={assets} />
      <BarsShape shared={shared} />
      <OrbitShape shared={shared} assets={assets} />
    </group>
  );
}

/* ---------- Cena ---------- */

export default function Scene3D() {
  const shared = useRef({
    weights: { card: 0, stack: 0, bars: 0, orbit: 0 },
    px: 0,
    py: 0,
    tx: 0,
    ty: 0,
    scroll: 0,
    t: 0,
  });
  const compact = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div className="fixed inset-0 z-[1] pointer-events-none" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 30 }}
        dpr={[1, compact ? 1.5 : 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 5, 6]} intensity={2.2} />
        <directionalLight position={[-4, -2, 3]} intensity={0.7} color={MINT} />

        <Environment resolution={256} frames={1}>
          <mesh scale={40}>
            <sphereGeometry args={[1, 24, 24]} />
            <meshBasicMaterial color="#39414f" side={THREE.BackSide} />
          </mesh>
          <Lightformer form="rect" intensity={3} position={[0, 5, 3]} scale={[9, 3, 1]} color="#ffffff" />
          <Lightformer form="rect" intensity={2} position={[-5, 1, 2]} scale={[3, 6, 1]} color={MINT} />
          <Lightformer form="rect" intensity={1.6} position={[5, -1, 3]} scale={[3, 5, 1]} color="#ffffff" />
        </Environment>

        <Rig shared={shared} />
      </Canvas>
    </div>
  );
}
