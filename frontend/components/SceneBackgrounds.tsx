'use client'
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type Vec3 = [number, number, number]

// ── Sky (CSS gradient behind the transparent canvas) ──────────────────────────
export const REGION_SKY: Record<string, string> = {
  tropical: 'radial-gradient(circle at 50% 125%, #ffb24d 0%, #ff8163 18%, #ff6fa3 36%, #b56ec0 56%, #5a6ec4 80%, #1c2a66 100%)',
  desert:   'radial-gradient(circle at 50% 115%, #f3bd72 0%, #c5793a 38%, #4a2414 100%)',
  arctic:   'radial-gradient(circle at 50% 122%, #1d5070 0%, #0d2a48 48%, #050f24 100%)',
  ocean:    'radial-gradient(circle at 50% 116%, #2f86b8 0%, #135a8a 42%, #06243a 100%)',
  moon:     'radial-gradient(circle at 50% 45%, #0a141e 0%, #03070d 100%)',
  mars:     'radial-gradient(circle at 50% 116%, #e0986a 0%, #9a4326 38%, #341008 100%)',
}

// ── Fog (atmospheric depth) — [color, near, far]; null = no fog (vacuum) ───────
export const REGION_FOG: Record<string, Vec3OrNull> = {
  tropical: ['#c4708a', 18, 54],
  desert:   ['#c5793a', 16, 48],
  arctic:   ['#0d2a48', 16, 50],
  ocean:    ['#135a8a', 16, 48],
  moon:     null,
  mars:     ['#9a4326', 15, 46],
}
type Vec3OrNull = [string, number, number] | null

// ── Drifting particle field (snow, dust, pollen, mist) ────────────────────────
function ParticleField({
  count, spread, height, base, color, size, vy, drift, opacity = 0.7,
}: {
  count: number; spread: number; height: number; base: number
  color: string; size: number; vy: number; drift: number; opacity?: number
}) {
  const ref = useRef<THREE.Points>(null)
  const { geo, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * spread
      positions[i * 3 + 1] = base + Math.random() * height
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread
      seeds[i] = Math.random() * Math.PI * 2
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return { geo: g, seeds }
  }, [count, spread, height, base])

  useFrame(({ clock }, delta) => {
    if (!ref.current) return
    const arr = ref.current.geometry.attributes.position.array as Float32Array
    const t = clock.elapsedTime
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += vy * delta
      arr[i * 3]     += Math.sin(t * 0.5 + seeds[i]) * drift * delta
      if (vy < 0 && arr[i * 3 + 1] < base) arr[i * 3 + 1] = base + height
      if (vy > 0 && arr[i * 3 + 1] > base + height) arr[i * 3 + 1] = base
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={size} color={color} transparent opacity={opacity} sizeAttenuation depthWrite={false} />
    </points>
  )
}

// ── Starfield ─────────────────────────────────────────────────────────────────
function Stars({ count = 500, spread = 110, color = '#a0d8ef', size = 0.09, opacity = 1 }: {
  count?: number; spread?: number; color?: string; size?: number; opacity?: number
}) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * spread
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [count, spread])

  return (
    <points geometry={geometry}>
      <pointsMaterial size={size} color={color} sizeAttenuation transparent opacity={opacity} fog={false} />
    </points>
  )
}

// ── Space objects (planets, galaxy, comet) — used by the Moon scene ───────────
// Vertical band texture for gas giants (bands wrap around as latitudes).
function makeBandedTexture(colors: string[]): THREE.Texture | null {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = 8; c.height = 128
  const ctx = c.getContext('2d')
  if (!ctx) return null
  const g = ctx.createLinearGradient(0, 0, 0, 128)
  const n = colors.length
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    g.addColorStop(Math.max(0, t - 0.04), colors[i])   // small hard step → defined bands
    g.addColorStop(Math.min(1, t + 0.04), colors[i])
  }
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 8, 128)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// Saturn ring system — concentric bands with a Cassini-style gap.
const SATURN_RINGS = [
  { i: 2.7, o: 3.28, c: '#e0c193', op: 0.6 },
  { i: 3.34, o: 3.5, c: '#6a4f2e', op: 0.18 },   // gap
  { i: 3.56, o: 4.28, c: '#f0d6a6', op: 0.62 },
  { i: 4.33, o: 4.58, c: '#b89464', op: 0.38 },
  { i: 4.64, o: 4.98, c: '#9c7c52', op: 0.22 },
]

function SpaceObjects() {
  const saturnSpin = useRef<THREE.Mesh>(null)
  const iceSpin = useRef<THREE.Mesh>(null)
  const gasSpin = useRef<THREE.Mesh>(null)
  const galaxyRef = useRef<THREE.Points>(null)

  const galaxyGeo = useMemo(() => {
    const count = 520
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const t = i / count
      const r = 8 * t + (Math.random() - 0.5) * 2.0
      const angle = t * Math.PI * 9 + (Math.random() - 0.5) * 0.5
      pos[i * 3]     = Math.cos(angle) * r
      pos[i * 3 + 1] = (Math.random() - 0.5) * 1.4 * (1 - t * 0.65)
      pos[i * 3 + 2] = Math.sin(angle) * r
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return geo
  }, [])
  const saturnTex = useMemo(() => makeBandedTexture(['#caa46a', '#e3c690', '#b08a54', '#dcbc82', '#9a7444', '#c8a872']), [])
  const gasTex = useMemo(() => makeBandedTexture(['#5a3a78', '#7b4fa0', '#492a66', '#8a5fb0', '#3f2458']), [])

  // Planets are static — spread across the sky, only axial spin.
  useFrame((_, delta) => {
    if (saturnSpin.current) saturnSpin.current.rotation.y += delta * 0.12
    if (iceSpin.current)    iceSpin.current.rotation.y += delta * 0.18
    if (gasSpin.current)    gasSpin.current.rotation.y += delta * 0.10
    if (galaxyRef.current)  galaxyRef.current.rotation.y += delta * 0.03
  })

  return (
    <group>
      {/* Saturn — right side, well away from Earth (upper-left) */}
      <group position={[32, 14, -52]}>
        <group rotation={[0.46, 0, 0.16]}>
          <mesh ref={saturnSpin}>
            <sphereGeometry args={[2.2, 40, 28]} />
            <meshStandardMaterial map={saturnTex ?? undefined} color={saturnTex ? '#ffffff' : '#caa46a'} emissive="#3a2810" emissiveIntensity={0.12} roughness={0.85} />
          </mesh>
          {SATURN_RINGS.map((r, i) => (
            <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[r.i, r.o, 96]} />
              <meshBasicMaterial color={r.c} side={THREE.DoubleSide} transparent opacity={r.op} depthWrite={false} />
            </mesh>
          ))}
        </group>
        <pointLight intensity={0.07} color="#e0c193" distance={28} decay={1} />
      </group>

      {/* Ice planet — right side, low */}
      <group position={[34, 8, -42]}>
        <mesh ref={iceSpin}>
          <sphereGeometry args={[1.5, 28, 18]} />
          <meshStandardMaterial color="#6ab0d4" emissive="#1a4060" emissiveIntensity={0.2} roughness={0.7} />
        </mesh>
        <pointLight intensity={0.05} color="#6ab0d4" distance={22} decay={1} />
      </group>

      {/* Purple gas giant — upper center */}
      <group position={[10, 26, -58]}>
        <mesh ref={gasSpin}>
          <sphereGeometry args={[1.8, 28, 18]} />
          <meshStandardMaterial map={gasTex ?? undefined} color={gasTex ? '#ffffff' : '#7b4fa0'} emissive="#2a0a40" emissiveIntensity={0.22} roughness={0.8} />
        </mesh>
      </group>

      {/* Spiral galaxy — far left */}
      <group position={[-52, 6, -68]} rotation={[0.25, 0.6, 0.1]}>
        <points ref={galaxyRef} geometry={galaxyGeo}>
          <pointsMaterial size={0.22} color="#c8a0ff" sizeAttenuation transparent opacity={0.6} fog={false} />
        </points>
      </group>

      {/* Comet — static diagonal streak, upper right */}
      <group position={[28, 18, -46]} rotation={[0, 0, -0.45]}>
        <mesh>
          <sphereGeometry args={[0.22, 10, 8]} />
          <meshStandardMaterial color="#ffffff" emissive="#aaddff" emissiveIntensity={2.8} />
        </mesh>
        <mesh position={[0, 0, 1.6]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.12, 3.2, 6]} />
          <meshStandardMaterial color="#88ccff" transparent opacity={0.22} emissive="#88ccff" emissiveIntensity={0.3} />
        </mesh>
        <pointLight intensity={0.45} color="#aaddff" distance={12} decay={2} />
      </group>
    </group>
  )
}

// ── Low-poly bumpy terrain disc (Moon / Mars ground) ──────────────────────────
function CraterTerrain({ y, color, emissive, emissiveIntensity }: {
  y: number; color: string; emissive: string; emissiveIntensity: number
}) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(150, 150, 64, 64)
    const arr = g.attributes.position.array as Float32Array
    for (let i = 0; i < arr.length; i += 3) {
      const x = arr[i], yy = arr[i + 1]
      const d = Math.hypot(x, yy)
      arr[i + 2] =
        Math.sin(x * 0.4) * Math.cos(yy * 0.4) * 0.7 +
        Math.sin(d * 0.7) * 0.45 +
        (Math.random() - 0.5) * 0.5
    }
    g.computeVertexNormals()
    return g
  }, [])
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
      <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} roughness={1} metalness={0} flatShading />
    </mesh>
  )
}

// ── Tropical ───────────────────────────────────────────────────────────────────
// Curved trunk + arcing, drooping fronds (shared geometry, built once).
const PALM_TRUNK_GEO = new THREE.TubeGeometry(
  new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.12, 0.95, 0.04),
    new THREE.Vector3(0.34, 1.9, 0.02),
    new THREE.Vector3(0.66, 2.8, -0.05),
    new THREE.Vector3(1.0, 3.3, -0.12),
  ]), 18, 0.085, 7, false,
)
// Broad, serrated, pointed palm leaf that arcs downward (built once).
function makePalmFrondGeo(): THREE.BufferGeometry {
  const N = 18
  const halfWidth = (t: number) => {
    const base = Math.sin(Math.min(1, t / 0.22) * Math.PI / 2)   // ramp up from a narrow base
    const taper = Math.pow(1 - t, 0.7)                            // taper to a point
    return 0.02 + 0.22 * base * taper
  }
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  for (let i = 1; i <= N; i++) {                 // top edge, sawtooth (feathered)
    const t = i / N
    shape.lineTo(t, halfWidth(t) + (i % 2 === 0 ? 0.04 : 0))
  }
  shape.lineTo(1, 0)                             // tip
  for (let i = N - 1; i >= 1; i--) {             // bottom edge back
    const t = i / N
    shape.lineTo(t, -(halfWidth(t) + (i % 2 === 0 ? 0.04 : 0)))
  }
  shape.closePath()

  const geo = new THREE.ShapeGeometry(shape, 1)
  // remap XY → XZ (horizontal blade) and droop in Y along its length
  const pos = geo.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)                // (x = length, y = width, z = 0)
    pos.setXYZ(i, v.x, -0.55 * Math.pow(v.x, 1.7), v.y)
  }
  geo.computeVertexNormals()
  return geo
}
const PALM_FROND_GEO = makePalmFrondGeo()

function Palm({ position, rotation, scale }: { position: Vec3; rotation: Vec3; scale: number }) {
  const crown: Vec3 = [1.0, 3.3, -0.12]
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={PALM_TRUNK_GEO}>
        <meshStandardMaterial color="#6e3450" roughness={1} emissive="#3a1c2e" emissiveIntensity={0.15} />
      </mesh>
      <group position={crown}>
        {/* coconut cluster */}
        <mesh>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color="#5a2842" roughness={1} />
        </mesh>
        {/* broad, serrated, drooping palm fronds (sunset-pink) */}
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2
          const len = 1.4 + (i % 3) * 0.22
          const lift = 0.2 + (i % 3) * 0.12           // base fans up, blade arcs down
          return (
            <group key={i} rotation={[0, a, lift]} scale={len}>
              <mesh geometry={PALM_FROND_GEO}>
                <meshStandardMaterial color="#a85080" roughness={1} emissive="#4e2440" emissiveIntensity={0.2} side={THREE.DoubleSide} />
              </mesh>
            </group>
          )
        })}
      </group>
    </group>
  )
}

// Soft rolling jungle hills: flat near the platforms, rising to distant ridges.
function JungleHills() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(170, 170, 100, 100)
    const arr = g.attributes.position.array as Float32Array
    for (let i = 0; i < arr.length; i += 3) {
      const x = arr[i], y = arr[i + 1]
      const d = Math.hypot(x, y)
      const rise = Math.min(1, Math.max(0, (d - 7) / 24))      // 0 near centre → 1 far
      arr[i + 2] = (
        Math.sin(x * 0.16) * Math.cos(y * 0.19) * 1.6 +
        Math.sin(d * 0.42) * 1.0 +
        (Math.random() - 0.5) * 0.5
      ) * rise - 1.0
    }
    g.computeVertexNormals()
    return g
  }, [])
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.7, 0]}>
      <meshStandardMaterial color="#854a6a" emissive="#3c1e32" emissiveIntensity={0.16} roughness={1} metalness={0} />
    </mesh>
  )
}

function TropicalBackground() {
  const palms = useMemo(() =>
    Array.from({ length: 11 }, (_, i) => {
      const a = (i / 11) * Math.PI * 2 + 0.25
      const r = 13 + Math.random() * 4
      return {
        pos: [Math.cos(a) * r, -2.0, Math.sin(a) * r] as Vec3,
        rot: [0, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.2] as Vec3,
        s: 0.9 + Math.random() * 0.7,
      }
    }), [])
  return (
    <group>
      <hemisphereLight args={['#ffc9b8', '#5a2c46', 0.5]} />
      {/* sunset sun — low on the horizon, partially behind the distant hills */}
      <mesh position={[2, -1.5, -30]}>
        <sphereGeometry args={[3.5, 28, 28]} />
        <meshBasicMaterial color="#ff9a4a" fog={false} />
      </mesh>
      <mesh position={[2, -1.5, -30]}>
        <sphereGeometry args={[5.2, 28, 28]} />
        <meshBasicMaterial color="#ff7a5a" transparent opacity={0.2} fog={false} />
      </mesh>
      <pointLight position={[2, 1, -24]} intensity={0.55} color="#ff8a4a" distance={70} decay={1} />
      <JungleHills />
      {palms.map((p, i) => <Palm key={i} position={p.pos} rotation={p.rot} scale={p.s} />)}
      {/* fireflies / drifting spores at dusk */}
      <ParticleField count={70} spread={24} height={8} base={-1.5} color="#ffe2a0" size={0.07} vy={0.18} drift={0.4} opacity={0.7} />
    </group>
  )
}

// ── Desert ───────────────────────────────────────────────────────────────────
// Endless sand sea: ridged sine waves form crescent dunes swept by the wind.
function DuneField() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(160, 160, 110, 110)
    const arr = g.attributes.position.array as Float32Array
    for (let i = 0; i < arr.length; i += 3) {
      const x = arr[i], y = arr[i + 1]
      // primary ridges (run along Y, meander via a slow cross-sine) + secondary detail
      const ridge = Math.sin(x * 0.17 + Math.sin(y * 0.07) * 1.6)
      const crest = Math.pow(ridge * 0.5 + 0.5, 1.5)        // sharpen the crest lines
      arr[i + 2] =
        crest * 2.4 +
        Math.sin(y * 0.11 + 0.5) * 0.45 +
        Math.sin(x * 0.55) * 0.12 -
        1.2
    }
    g.computeVertexNormals()
    return g
  }, [])
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.7, 0]}>
      <meshStandardMaterial color="#d8a55e" emissive="#6e3f1e" emissiveIntensity={0.1} roughness={1} metalness={0} />
    </mesh>
  )
}

function DesertBackground() {
  const buttes = useMemo(() =>
    Array.from({ length: 4 }, (_, i) => {
      const a = (i / 4) * Math.PI * 2 + 1.1
      const r = 22 + Math.random() * 6
      return [Math.cos(a) * r, -1.5, Math.sin(a) * r] as Vec3
    }), [])
  return (
    <group>
      <hemisphereLight args={['#f0c890', '#6a3a1e', 0.5]} />
      <mesh position={[12, 6, -16]}>
        <sphereGeometry args={[2.8, 24, 24]} />
        <meshBasicMaterial color="#fff0c8" fog={false} />
      </mesh>
      <pointLight position={[12, 8, -16]} intensity={0.6} color="#ffdca0" distance={80} decay={1} />
      <DuneField />
      {/* distant rock pyramids — uniform size, square base aligned to axes */}
      {buttes.map((pos, i) => (
        <mesh key={i} position={pos} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[5.2, 6, 4]} />
          <meshStandardMaterial color="#a8612f" roughness={1} emissive="#5a2c12" emissiveIntensity={0.14} flatShading />
        </mesh>
      ))}
      <ParticleField count={160} spread={30} height={6} base={-2} color="#e8c890" size={0.05} vy={0} drift={1.6} opacity={0.3} />
    </group>
  )
}

// ── Arctic ───────────────────────────────────────────────────────────────────
function AuroraRibbon({ y, z, w = 46, h = 7, colorBottom, colorTop, speed, amp, opacity }: {
  y: number; z: number; w?: number; h?: number; colorBottom: string; colorTop: string; speed: number; amp: number; opacity: number
}) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(w, h, 64, 1)
    const pos = g.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const cA = new THREE.Color(colorBottom)
    const cB = new THREE.Color(colorTop)
    const tmp = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const v = (pos.getY(i) + h / 2) / h          // 0 bottom → 1 top
      tmp.copy(cA).lerp(cB, v)
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return g
  }, [w, h, colorBottom, colorTop])
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as ArrayLike<number>), [geo])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed
    const arr = geo.attributes.position.array as Float32Array
    for (let i = 0; i < arr.length; i += 3) {
      const x = base[i]
      arr[i + 2] = Math.sin(x * 0.22 + t) * amp + Math.sin(x * 0.55 - t * 1.3) * amp * 0.4
      arr[i + 1] = base[i + 1] + Math.sin(x * 0.35 + t * 0.7) * 0.8
    }
    geo.attributes.position.needsUpdate = true
  })
  return (
    <mesh geometry={geo} position={[0, y, z]}>
      <meshBasicMaterial vertexColors transparent opacity={opacity} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} fog={false} />
    </mesh>
  )
}

// Jagged glacier — a cluster of angular ice shards (4-sided cones) instead of one plain cone.
function IcebergCluster({ position, scale, rotation }: { position: Vec3; scale: number; rotation: number }) {
  const shards = useMemo(() =>
    Array.from({ length: 4 }, () => ({
      p: [(Math.random() - 0.5) * 1.3, Math.random() * 0.5, (Math.random() - 0.5) * 1.3] as Vec3,
      r: 0.5 + Math.random() * 0.7,
      h: 1.3 + Math.random() * 1.8,
      ry: Math.random() * Math.PI,
      tilt: (Math.random() - 0.5) * 0.5,
    })), [])
  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      {shards.map((s, i) => (
        <mesh key={i} position={s.p} rotation={[s.tilt, s.ry, s.tilt * 0.6]}>
          <coneGeometry args={[s.r, s.h, 4]} />
          <meshStandardMaterial color="#cfe8f2" roughness={0.35} metalness={0.1} emissive="#3a78a0" emissiveIntensity={0.28} flatShading />
        </mesh>
      ))}
    </group>
  )
}

// Cracked sea ice that surrounds the platforms (fills the empty void).
function IceFloe() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(160, 160, 90, 90)
    const arr = g.attributes.position.array as Float32Array
    for (let i = 0; i < arr.length; i += 3) {
      const x = arr[i], y = arr[i + 1]
      arr[i + 2] =
        Math.sin(x * 0.25) * Math.cos(y * 0.25) * 0.3 +
        Math.abs(Math.sin(x * 0.09 + y * 0.05)) * 0.5 +   // pressure ridges
        (Math.random() - 0.5) * 0.25 - 0.5
    }
    g.computeVertexNormals()
    return g
  }, [])
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.7, 0]}>
      <meshStandardMaterial color="#bcd6e6" emissive="#274a64" emissiveIntensity={0.18} roughness={0.55} metalness={0.05} flatShading />
    </mesh>
  )
}

function ArcticBackground() {
  const bergs = useMemo(() =>
    Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2 + 0.15            // evenly spaced around
      const r = 17 + (i % 3) * 3 + Math.random() * 2     // staggered rings, well separated
      return {
        pos: [Math.cos(a) * r, -2.6, Math.sin(a) * r] as Vec3,
        s: 1.4 + Math.random() * 2.0,
        rot: Math.random() * Math.PI,
      }
    }), [])
  return (
    <group>
      <hemisphereLight args={['#cfe8ff', '#13344e', 0.55]} />
      <Stars count={140} color="#cfe8ff" size={0.05} opacity={0.7} />
      {/* cool fill + green glow from the aurora overhead (no sun) */}
      <pointLight position={[0, 16, -10]} intensity={0.35} color="#5affc0" distance={50} decay={1.5} />
      <pointLight position={[-12, 6, 8]} intensity={0.25} color="#9fd0ff" distance={40} decay={1.5} />
      {/* single aurora curtain — green → violet gradient */}
      <AuroraRibbon y={11} z={-20} w={66} h={10} colorBottom="#3affa0" colorTop="#8a5cff" speed={0.4} amp={2.8} opacity={0.24} />
      <IceFloe />
      {bergs.map((b, i) => <IcebergCluster key={i} position={b.pos} scale={b.s} rotation={b.rot} />)}
      <ParticleField count={260} spread={32} height={16} base={-2} color="#ffffff" size={0.07} vy={-0.6} drift={0.5} opacity={0.85} />
    </group>
  )
}

// ── Ocean ────────────────────────────────────────────────────────────────────
function Ocean() {
  const geo = useMemo(() => new THREE.PlaneGeometry(130, 130, 60, 60), [])
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as ArrayLike<number>), [geo])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const arr = geo.attributes.position.array as Float32Array
    for (let i = 0; i < arr.length; i += 3) {
      const x = base[i], y = base[i + 1]
      arr[i + 2] = Math.sin(x * 0.3 + t) * 0.35 + Math.cos(y * 0.4 + t * 0.8) * 0.3
    }
    geo.attributes.position.needsUpdate = true
    geo.computeVertexNormals()
  })
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.6, 0]}>
      <meshStandardMaterial color="#1a5a8a" emissive="#0a2a4a" emissiveIntensity={0.3} roughness={0.2} metalness={0.5} transparent opacity={0.92} side={THREE.DoubleSide} />
    </mesh>
  )
}

function OceanBackground() {
  return (
    <group>
      <hemisphereLight args={['#bfe0ff', '#062038', 0.5]} />
      <pointLight position={[10, 12, -18]} intensity={0.45} color="#cfe4ff" distance={80} decay={1} />
      <Ocean />
      <ParticleField count={70} spread={20} height={6} base={-2.4} color="#bfeaff" size={0.05} vy={0.3} drift={0.2} opacity={0.4} />
    </group>
  )
}

// ── Moon ─────────────────────────────────────────────────────────────────────
// Procedural blue-marble texture: oceans, irregular continents, polar caps.
function makeEarthTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = 1024; c.height = 512
  const ctx = c.getContext('2d')
  if (!ctx) return null

  // Ocean
  const og = ctx.createLinearGradient(0, 0, 0, 512)
  og.addColorStop(0, '#0d3a72'); og.addColorStop(0.5, '#1d6cb4'); og.addColorStop(1, '#0d3a72')
  ctx.fillStyle = og
  ctx.fillRect(0, 0, 1024, 512)

  // Draw one blob polygon (jagged circle).
  function drawBlob(cx: number, cy: number, r: number) {
    const pts = 10 + Math.floor(Math.random() * 6)
    ctx!.beginPath()
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * Math.PI * 2
      const br = r * (0.42 + Math.random() * 0.95)
      const x = cx + Math.cos(a) * br + (Math.random() - 0.5) * r * 0.25
      const y = cy + Math.sin(a) * br * 0.7 + (Math.random() - 0.5) * r * 0.2
      if (i === 0) ctx!.moveTo(x, y)
      else ctx!.lineTo(x, y)
    }
    ctx!.closePath()
    ctx!.fill()
  }

  // Draw a connected landmass: a core blob + attached limbs that overlap it,
  // producing a single irregular land body rather than separate islands.
  function drawLandmass(cx: number, cy: number, coreR: number,
    limbs: Array<{ dx: number; dy: number; r: number }>) {
    drawBlob(cx, cy, coreR)
    for (const lb of limbs) drawBlob(cx + lb.dx, cy + lb.dy, lb.r)
  }

  ctx.fillStyle = '#3f8a44'

  // 4 connected landmasses — each is a core with multiple overlapping limbs.
  // Positioned so that some edge-to-edge wrapping (wrapS) creates the impression
  // of a continuous Pangaea-like world.
  drawLandmass(200, 190, 82, [
    { dx: -55, dy: 30, r: 54 }, { dx: 60, dy: -20, r: 48 },
    { dx: 20, dy: 70, r: 44 }, { dx: -30, dy: -50, r: 40 },
    { dx: 90, dy: 45, r: 36 },
  ])
  drawLandmass(560, 180, 70, [
    { dx: 65, dy: 10, r: 60 }, { dx: -50, dy: 35, r: 46 },
    { dx: 110, dy: -25, r: 42 }, { dx: 30, dy: 65, r: 38 },
    { dx: 145, dy: 40, r: 34 },
  ])
  drawLandmass(870, 200, 65, [
    { dx: -60, dy: 25, r: 50 }, { dx: 50, dy: -15, r: 42 },
    { dx: -20, dy: 65, r: 36 },
  ])
  drawLandmass(330, 330, 58, [
    { dx: 55, dy: -20, r: 46 }, { dx: -40, dy: 20, r: 40 },
    { dx: 25, dy: 55, r: 34 },
  ])

  // polar caps
  const cap = ctx.createLinearGradient(0, 0, 0, 70)
  cap.addColorStop(0, 'rgba(238,246,255,1)'); cap.addColorStop(1, 'rgba(238,246,255,0)')
  ctx.fillStyle = cap; ctx.fillRect(0, 0, 1024, 70)
  const cap2 = ctx.createLinearGradient(0, 512, 0, 442)
  cap2.addColorStop(0, 'rgba(238,246,255,1)'); cap2.addColorStop(1, 'rgba(238,246,255,0)')
  ctx.fillStyle = cap2; ctx.fillRect(0, 442, 1024, 70)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  return tex
}

function Earth() {
  const ref = useRef<THREE.Mesh>(null)
  const tex = useMemo(() => makeEarthTexture(), [])
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.03
  })
  return (
    <group position={[-26, 12, -40]} rotation={[0.25, 0, 0.18]}>
      <mesh ref={ref}>
        <sphereGeometry args={[3.4, 48, 32]} />
        <meshStandardMaterial map={tex ?? undefined} color={tex ? '#ffffff' : '#2a6ac8'} roughness={0.85} metalness={0.02} emissive="#0a1a3a" emissiveIntensity={0.12} fog={false} />
      </mesh>
      {/* atmosphere rim glow */}
      <mesh scale={1.06}>
        <sphereGeometry args={[3.4, 32, 24]} />
        <meshBasicMaterial color="#5aa6ff" transparent opacity={0.16} side={THREE.BackSide} fog={false} />
      </mesh>
      <pointLight intensity={0.12} color="#3a7aff" distance={40} decay={1} />
    </group>
  )
}

function MoonBackground() {
  return (
    <group>
      <Stars />
      <SpaceObjects />
      <Earth />
      {/* harsh white sun */}
      <mesh position={[30, 16, -30]}>
        <sphereGeometry args={[2, 20, 20]} />
        <meshBasicMaterial color="#ffffff" fog={false} />
      </mesh>
      <directionalLight position={[30, 16, -30]} intensity={0.7} color="#ffffff" />
      <CraterTerrain y={-3} color="#8a8a92" emissive="#1a1a22" emissiveIntensity={0.4} />
    </group>
  )
}

// ── Mars ─────────────────────────────────────────────────────────────────────
// Lumpy asymmetric rock — deformed icosahedron. Displacement is a pure function of
// position so coincident verts move together (faces stay sealed). Not pointy.
function makeRockGeo(seed: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 1)
  const pos = g.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const n = 1
      + 0.16 * Math.sin(v.x * 3.0 + seed)
      + 0.12 * Math.sin(v.y * 3.5 + seed * 1.7)
      + 0.10 * Math.sin(v.z * 4.0 + seed * 2.3)
    v.multiplyScalar(n)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  g.computeVertexNormals()
  return g
}

// Rocky, asymmetric massif — a cluster of lumpy boulders (no sharp peaks).
function MarsMountain({ position, scale, rotation }: { position: Vec3; scale: number; rotation: number }) {
  const rocks = useMemo(() =>
    Array.from({ length: 3 }, (_, i) => ({
      geo: makeRockGeo(i * 3.1 + Math.random() * 6),
      p: [(Math.random() - 0.5) * 1.8, 0, (Math.random() - 0.5) * 1.8] as Vec3,
      s: [1.2 + Math.random() * 0.35, 0.4 + Math.random() * 0.18, 1.2 + Math.random() * 0.35] as Vec3,
      ry: Math.random() * Math.PI,
    })), [])
  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      {rocks.map((r, i) => (
        <mesh key={i} geometry={r.geo} position={[r.p[0], r.s[1] * 0.7, r.p[2]]} scale={r.s} rotation={[0, r.ry, 0]}>
          <meshStandardMaterial color="#9a4426" roughness={1} emissive="#5a1e0e" emissiveIntensity={0.16} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function MarsBackground() {
  const mountains = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2 + 0.2
      const r = 18 + Math.random() * 7
      return {
        pos: [Math.cos(a) * r, -3, Math.sin(a) * r] as Vec3,
        s: 1.4 + Math.random() * 0.5,
        rot: Math.random() * Math.PI,
      }
    }), [])
  return (
    <group>
      <hemisphereLight args={['#e0a070', '#3a1208', 0.5]} />
      <Stars count={140} color="#ffd8b0" size={0.06} opacity={0.5} />
      <mesh position={[16, 7, -20]}>
        <sphereGeometry args={[2.2, 24, 24]} />
        <meshBasicMaterial color="#ffd9a0" fog={false} />
      </mesh>
      <pointLight position={[16, 9, -20]} intensity={0.55} color="#ffb070" distance={70} decay={1} />
      {/* Phobos & Deimos */}
      <mesh position={[-14, 11, -22]}>
        <sphereGeometry args={[0.7, 16, 12]} />
        <meshStandardMaterial color="#9a8a7a" emissive="#2a1a10" emissiveIntensity={0.2} roughness={1} fog={false} />
      </mesh>
      <mesh position={[8, 14, -26]}>
        <sphereGeometry args={[0.4, 14, 10]} />
        <meshStandardMaterial color="#8a7a6a" roughness={1} fog={false} />
      </mesh>
      {mountains.map((m, i) => <MarsMountain key={i} position={m.pos} scale={m.s} rotation={m.rot} />)}
      <CraterTerrain y={-3} color="#b0522c" emissive="#4a1808" emissiveIntensity={0.35} />
      <ParticleField count={200} spread={34} height={8} base={-2.5} color="#e8a878" size={0.06} vy={0} drift={1.8} opacity={0.28} />
    </group>
  )
}

// ── Dispatcher ───────────────────────────────────────────────────────────────
export function SceneBackground({ region }: { region: string }) {
  switch (region) {
    case 'tropical': return <TropicalBackground />
    case 'desert':   return <DesertBackground />
    case 'arctic':   return <ArcticBackground />
    case 'ocean':    return <OceanBackground />
    case 'moon':     return <MoonBackground />
    case 'mars':     return <MarsBackground />
    default:         return <MoonBackground />
  }
}
