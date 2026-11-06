import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Html, Lightformer, OrbitControls, RoundedBox } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

const COLORS = ["#f08a3c", "#2ec4b6", "#f6b04a", "#ff6b4a", "#7dd3c0", "#e9c46a"];

function Bar({ x, h, color, label, value, delay }: { x: number; h: number; color: string; label: string; value: number; delay: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const grow = useRef(0);
  const [hover, setHover] = useState(false);
  useFrame((s, d) => {
    if (s.clock.elapsedTime < delay || !ref.current) return;
    grow.current += (1 - grow.current) * (1 - Math.exp(-3 * Math.min(d, 0.05)));
    const cur = Math.max(0.02, h * grow.current);
    ref.current.scale.y = cur;
    ref.current.position.y = cur / 2;
  });
  return (
    <group position={[x, 0, 0]}>
      <RoundedBox ref={ref} args={[0.6, 1, 0.6]} radius={0.08} smoothness={3} scale={[1, 0.02, 1]}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); }} onPointerOut={() => setHover(false)}>
        <meshPhysicalMaterial color={color} roughness={0.15} metalness={0.2} clearcoat={1}
          emissive={color} emissiveIntensity={hover ? 0.6 : 0.12} transparent opacity={0.92} />
      </RoundedBox>
      <Html position={[0, h + 0.35, 0]} center distanceFactor={8} style={{ pointerEvents: "none" }}>
        <div className={`whitespace-nowrap rounded-md px-2 py-1 font-mono text-[11px] transition-opacity ${hover ? "glass opacity-100" : "opacity-70"}`}>
          {hover ? `${label}: ${value}` : value}
        </div>
      </Html>
    </group>
  );
}

function Floor() {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.001}>
      <circleGeometry args={[3.4, 64]} />
      <meshStandardMaterial color="#0a1a22" roughness={0.3} metalness={0.7} transparent opacity={0.55} />
    </mesh>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 6, 4]} intensity={2} />
      <Environment resolution={64}>
        <Lightformer intensity={1.4} position={[0, 5, 0]} scale={[10, 10, 1]} color="#ffe2c4" />
        <Lightformer intensity={1.5} position={[-5, 1, 0]} rotation-y={Math.PI / 2} scale={[10, 2, 1]} color="#2ec4b6" />
      </Environment>
    </>
  );
}

export function Bars3D({ data }: { data: { name: string; n: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.n));
  const gap = 0.95, off = ((data.length - 1) * gap) / 2;
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [3.5, 3.2, 6], fov: 38 }}>
      <Lights />
      <group position={[0, -1.2, 0]}>
        <Floor />
        {data.map((d, i) => (
          <Bar key={d.name} x={i * gap - off} h={(d.n / max) * 2.6} color={COLORS[i % COLORS.length]!} label={d.name} value={d.n} delay={i * 0.08} />
        ))}
      </group>
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.6} maxPolarAngle={Math.PI / 2.2} />
    </Canvas>
  );
}

function Slice({ start, len, color, label, value, total }: { start: number; len: number; color: string; label: string; value: number; total: number }) {
  const [hover, setHover] = useState(false);
  const ref = useRef<THREE.Mesh>(null);
  const shape = useMemo(() => {
    const s = new THREE.Shape(), R = 1.6, r = 0.9;
    s.absarc(0, 0, R, start, start + len, false);
    s.absarc(0, 0, r, start + len, start, true);
    return s;
  }, [start, len]);
  const mid = start + len / 2;
  useFrame((_, d) => {
    if (!ref.current) return;
    const target = hover ? 0.18 : 0;
    const k = 1 - Math.exp(-8 * Math.min(d, 0.05));
    ref.current.position.x += (Math.cos(mid) * target - ref.current.position.x) * k;
    ref.current.position.y += (Math.sin(mid) * target - ref.current.position.y) * k;
  });
  return (
    <mesh ref={ref} onPointerOver={(e) => { e.stopPropagation(); setHover(true); }} onPointerOut={() => setHover(false)}>
      <extrudeGeometry args={[shape, { depth: 0.35 + (value / total) * 0.5, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, curveSegments: 48 }]} />
      <meshPhysicalMaterial color={color} roughness={0.2} clearcoat={1} emissive={color} emissiveIntensity={hover ? 0.5 : 0.05} metalness={0.3} />
      {hover && (
        <Html position={[Math.cos(mid) * 2.1, Math.sin(mid) * 2.1, 0.6]} center style={{ pointerEvents: "none" }}>
          <div className="glass whitespace-nowrap rounded-md px-2 py-1 font-mono text-[11px]">{label}: {value} ({Math.round((value / total) * 100)}%)</div>
        </Html>
      )}
    </mesh>
  );
}

function Spin({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame((s) => { if (g.current) { g.current.rotation.z = s.clock.elapsedTime * 0.15; g.current.rotation.x = -0.6 + s.pointer.y * 0.2; g.current.rotation.y = s.pointer.x * 0.25; } });
  return <group ref={g}>{children}</group>;
}

export function Donut3D({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((a, b) => a + b.value, 0) || 1;
  let acc = 0;
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 7], fov: 40 }}>
      <Lights />
      <Spin>
        {data.map((d, i) => {
          const len = (d.value / total) * Math.PI * 2, start = acc; acc += len;
          return <Slice key={d.name} start={start} len={Math.max(0.01, len - 0.03)} color={COLORS[i % COLORS.length]!} label={d.name} value={d.value} total={total} />;
        })}
      </Spin>
    </Canvas>
  );
}

export default { Bars3D, Donut3D };
