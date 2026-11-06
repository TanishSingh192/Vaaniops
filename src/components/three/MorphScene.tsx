import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Lightformer, Sparkles } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { scrollState } from "@/lib/scroll-state";

// One sphere whose vertices morph into a cube, a sound-wave ring and a spiky "voice" burst
// as the visitor scrolls through the story.
function buildMorphGeometry() {
  const geo = new THREE.IcosahedronGeometry(1.25, 48);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const cube: number[] = [], ring: number[] = [], burst: number[] = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const m = Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z));
    cube.push((v.x / m) * 1.0, (v.y / m) * 1.0, (v.z / m) * 1.0);
    // torus: map sphere angle onto a ring
    const theta = Math.atan2(v.z, v.x), phi = Math.asin(THREE.MathUtils.clamp(v.y, -1, 1)) * 2;
    const R = 1.25, r = 0.42;
    ring.push((R + r * Math.cos(phi)) * Math.cos(theta), r * Math.sin(phi), (R + r * Math.cos(phi)) * Math.sin(theta));
    const spike = 1.15 + 0.45 * Math.pow(Math.abs(Math.sin(v.x * 7) * Math.sin(v.y * 7) * Math.sin(v.z * 7)), 0.6);
    burst.push(v.x * spike, v.y * spike, v.z * spike);
  }
  geo.morphAttributes.position = [
    new THREE.Float32BufferAttribute(cube, 3),
    new THREE.Float32BufferAttribute(ring, 3),
    new THREE.Float32BufferAttribute(burst, 3),
  ];
  return geo;
}

const PALETTE = ["#f08a3c", "#2ec4b6", "#f6b04a", "#ff6b4a"].map((c) => new THREE.Color(c));

function MorphBlob() {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshPhysicalMaterial>(null);
  const geo = useMemo(buildMorphGeometry, []);
  const smooth = useRef(0);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    smooth.current += (scrollState.progress * 3 - smooth.current) * (1 - Math.exp(-4 * dt));
    const p = smooth.current; // 0..3
    const m = mesh.current;
    if (!m || !m.morphTargetInfluences) return;
    const inf = m.morphTargetInfluences;
    for (let k = 0; k < 3; k++) inf[k] = THREE.MathUtils.clamp(1 - Math.abs(p - (k + 1)), 0, 1);
    const t = state.clock.elapsedTime;
    m.rotation.y += dt * 0.35;
    m.rotation.x = Math.sin(t * 0.3) * 0.25 + state.pointer.y * 0.3;
    m.rotation.z = state.pointer.x * 0.25;
    const idx = Math.floor(p), f = p - idx;
    color.copy(PALETTE[Math.min(idx, 3)]!).lerp(PALETTE[Math.min(idx + 1, 3)]!, f);
    mat.current?.color.copy(color);
  });

  return (
    <Float speed={1.4} rotationIntensity={0.3} floatIntensity={0.8}>
      <mesh ref={mesh} geometry={geo} morphTargetInfluences={[0, 0, 0]}>
        <meshPhysicalMaterial ref={mat} roughness={0.12} metalness={0.25} clearcoat={1} clearcoatRoughness={0.1}
          iridescence={0.8} iridescenceIOR={1.4} sheen={0.6} sheenColor="#2ec4b6" />
      </mesh>
    </Float>
  );
}

function Rings() {
  const g = useRef<THREE.Group>(null);
  useFrame((_, d) => { if (g.current) { g.current.rotation.z += d * 0.12; g.current.rotation.x = 1.15 + scrollState.progress * 0.8; } });
  return (
    <group ref={g}>
      {[2.1, 2.55, 3.0].map((r, i) => (
        <mesh key={r} rotation={[0, 0, i * 0.6]}>
          <torusGeometry args={[r, 0.008, 8, 160]} />
          <meshBasicMaterial color={i % 2 ? "#2ec4b6" : "#f08a3c"} transparent opacity={0.45 - i * 0.1} />
        </mesh>
      ))}
    </group>
  );
}

export default function MorphScene() {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 6], fov: 40 }} gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => gl.domElement.parentElement?.setAttribute("data-scene-ready", "")}>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 5, 3]} intensity={2.2} color="#ffd9b0" />
      <pointLight position={[-4, -2, 2]} intensity={30} color="#2ec4b6" />
      <MorphBlob />
      <Rings />
      <Sparkles count={70} scale={[8, 6, 4]} size={2.2} speed={0.35} color="#f6b04a" opacity={0.7} />
      <Environment resolution={128}>
        <Lightformer intensity={3} position={[0, 5, -2]} scale={[10, 3, 1]} color="#ffe2c4" />
        <Lightformer intensity={2} position={[-5, 0, 1]} rotation-y={Math.PI / 2} scale={[10, 2, 1]} color="#2ec4b6" />
        <Lightformer intensity={2} position={[5, -1, 1]} rotation-y={-Math.PI / 2} scale={[10, 2, 1]} color="#f08a3c" />
      </Environment>
    </Canvas>
  );
}
