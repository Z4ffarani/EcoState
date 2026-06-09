'use client'
import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useSimStore } from '@/store/useSimStore'
import { PLATFORMS, VECTOR_LABELS_PT, getPlatformHealth, healthColor, GameState } from '@/lib/vectors'

// ── Shared pie-slice geometry ─────────────────────────────────────────────────
let _sliceGeo: THREE.ExtrudeGeometry | null = null
function getSliceGeo(): THREE.ExtrudeGeometry {
  if (!_sliceGeo) {
    const inner = 1.65
    const outer = 3.2
    const halfSpan = Math.PI / 6 - 0.12   // ~23° → 46° arc, ~14° gap

    const shape = new THREE.Shape()
    shape.moveTo(inner * Math.cos(-halfSpan), inner * Math.sin(-halfSpan))
    shape.lineTo(outer * Math.cos(-halfSpan), outer * Math.sin(-halfSpan))
    shape.absarc(0, 0, outer, -halfSpan, halfSpan, false)
    shape.lineTo(inner * Math.cos(halfSpan), inner * Math.sin(halfSpan))
    shape.absarc(0, 0, inner, halfSpan, -halfSpan, true)

    _sliceGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.17,
      bevelEnabled: true,
      bevelSize: 0.022,
      bevelThickness: 0.022,
      bevelSegments: 2,
    })
    _sliceGeo.rotateX(-Math.PI / 2)
  }
  return _sliceGeo
}

// ── Platform icons ─────────────────────────────────────────────────────────────
// Icons raised so their bases start at y ≥ 0.38 (safely above platform top ~0.32).

function BioPlatformIcon({ color }: { color: THREE.Color }) {
  return (
    <group position={[2.4, 0.38, 0]}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 0.24, 6]} />
        <meshStandardMaterial color="#4a2f0a" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.34, 0]}>
        <coneGeometry args={[0.21, 0.26, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.65} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.52, 0]}>
        <coneGeometry args={[0.15, 0.22, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.78} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.67, 0]}>
        <coneGeometry args={[0.09, 0.16, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.95} roughness={0.55} />
      </mesh>
      <pointLight position={[0, 0.55, 0]} intensity={0.55} color={color} distance={1.6} decay={2} />
    </group>
  )
}

function HydroPlatformIcon({ color }: { color: THREE.Color }) {
  // Single unified teardrop via LatheGeometry — profile from (r=0, y=0) at bottom to tip.
  const dropGeo = useMemo(() => {
    const pts: THREE.Vector2[] = [
      new THREE.Vector2(0.000, 0.000),
      new THREE.Vector2(0.038, 0.013),
      new THREE.Vector2(0.092, 0.048),
      new THREE.Vector2(0.148, 0.108),
      new THREE.Vector2(0.183, 0.178),
      new THREE.Vector2(0.197, 0.238),  // widest point
      new THREE.Vector2(0.188, 0.298),
      new THREE.Vector2(0.162, 0.358),
      new THREE.Vector2(0.122, 0.412),
      new THREE.Vector2(0.076, 0.456),
      new THREE.Vector2(0.036, 0.494),
      new THREE.Vector2(0.000, 0.518),  // tip
    ]
    return new THREE.LatheGeometry(pts, 20)
  }, [])

  return (
    <group position={[2.4, 0.38, 0]}>
      <mesh geometry={dropGeo}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.82}
          transparent
          opacity={0.92}
          roughness={0.06}
          metalness={0.14}
        />
      </mesh>
      <pointLight position={[0, 0.28, 0]} intensity={0.5} color={color} distance={1.4} decay={2} />
    </group>
  )
}

function PowerPlatformIcon({ color }: { color: THREE.Color }) {
  const ringsRef = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (ringsRef.current) ringsRef.current.rotation.y = clock.elapsedTime * 0.45
  })
  return (
    <group position={[2.4, 0.52, 0]}>
      <mesh>
        <sphereGeometry args={[0.13, 14, 14]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
      </mesh>
      <group ref={ringsRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.25, 0.016, 6, 28]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} metalness={0.9} />
        </mesh>
        <mesh rotation={[Math.PI / 4, 0, Math.PI / 4]}>
          <torusGeometry args={[0.25, 0.016, 6, 28]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} metalness={0.9} />
        </mesh>
      </group>
      <pointLight intensity={0.5} color={color} distance={1.4} decay={2} />
    </group>
  )
}

function AtmoPlatformIcon({ color }: { color: THREE.Color }) {
  const moleculesRef = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (moleculesRef.current) moleculesRef.current.rotation.y = clock.elapsedTime * 0.30
  })
  return (
    <group position={[2.4, 0.38, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.19, 0.022, 6, 28]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.19, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} transparent opacity={0.12} metalness={0} roughness={0} side={THREE.DoubleSide} />
      </mesh>
      <group ref={moleculesRef}>
        {([0, 120, 240] as number[]).map((deg, i) => {
          const a = (deg * Math.PI) / 180
          return (
            <mesh key={i} position={[Math.cos(a) * 0.14, 0.09, Math.sin(a) * 0.14]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} />
            </mesh>
          )
        })}
      </group>
      <pointLight position={[0, 0.12, 0]} intensity={0.45} color={color} distance={1.4} decay={2} />
    </group>
  )
}

function HealthPlatformIcon({ color }: { color: THREE.Color }) {
  const crossRef = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (crossRef.current) crossRef.current.rotation.y = clock.elapsedTime * 0.19
  })
  return (
    <group ref={crossRef} position={[2.4, 0.56, 0]}>
      <mesh>
        <boxGeometry args={[0.36, 0.1, 0.07]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.88} metalness={0.4} roughness={0.3} />
      </mesh>
      <mesh>
        <boxGeometry args={[0.1, 0.36, 0.07]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.88} metalness={0.4} roughness={0.3} />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={0.5} color={color} distance={1.4} decay={2} />
    </group>
  )
}

function TechPlatformIcon({ color }: { color: THREE.Color }) {
  const signalRef = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (signalRef.current) {
      const t = clock.elapsedTime
      signalRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh
        const mat = mesh.material as THREE.MeshStandardMaterial
        mat.opacity = 0.25 + Math.sin(t * 2 - i * 0.7) * 0.35
      })
    }
  })
  return (
    <group position={[2.4, 0.38, 0]}>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.025, 0.04, 0.36, 6]} />
        <meshStandardMaterial color="#2a2a3a" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} />
      </mesh>
      <group ref={signalRef}>
        {([0.12, 0.2, 0.28] as number[]).map((r, i) => (
          <mesh key={i} position={[0, 0.15 - i * 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r, 0.014, 6, 32]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} transparent opacity={0.6} />
          </mesh>
        ))}
      </group>
      <pointLight position={[0, 0.38, 0]} intensity={0.2} color={color} distance={1.0} decay={2} />
    </group>
  )
}

const ICON_COMPONENTS: Record<string, React.ComponentType<{ color: THREE.Color }>> = {
  bio:    BioPlatformIcon,
  hydro:  HydroPlatformIcon,
  power:  PowerPlatformIcon,
  atmo:   AtmoPlatformIcon,
  health: HealthPlatformIcon,
  tech:   TechPlatformIcon,
}

// ── Platform (pie slice + icon) ───────────────────────────────────────────────
function Platform({ def, vectors, onClick }: {
  def: typeof PLATFORMS[0]
  vectors: GameState['vectors']
  onClick: () => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const health = getPlatformHealth(def, vectors)
  const color = healthColor(health)
  const threeColor = useMemo(() => new THREE.Color(color), [color])
  const defColor = useMemo(() => new THREE.Color(def.color), [def.color])
  const setPlatformTooltip = useSimStore((s) => s.setPlatformTooltip)
  const setPlatformModal = useSimStore((s) => s.setPlatformModal)
  const isTouchDevice = useMemo(() =>
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  , [])

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(clock.elapsedTime * 0.8 + def.angle * 0.05) * 0.06
    }
  })

  const Icon = ICON_COMPONENTS[def.id]

  return (
    <group ref={groupRef} rotation={[0, -(def.angle * Math.PI / 180), 0]}>
      <mesh
        geometry={getSliceGeo()}
        onClick={() => {
          if (isTouchDevice) setPlatformModal(def.id)
          onClick()
        }}
        onPointerEnter={(e) => {
          if (isTouchDevice) return
          e.stopPropagation()
          setPlatformTooltip({ id: def.id, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY })
        }}
        onPointerMove={(e) => {
          if (isTouchDevice) return
          setPlatformTooltip({ id: def.id, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY })
        }}
        onPointerLeave={() => {
          if (isTouchDevice) return
          setPlatformTooltip(null)
        }}
      >
        <meshStandardMaterial
          color={threeColor}
          emissive={threeColor}
          emissiveIntensity={0.18}
          metalness={0.35}
          roughness={0.55}
          transparent
          opacity={0.9}
        />
      </mesh>
      {Icon && <Icon color={defColor} />}
    </group>
  )
}

// ── Greenhouse hub ─────────────────────────────────────────────────────────────
function Greenhouse({ health }: { health: number }) {
  const houseRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (houseRef.current) {
      houseRef.current.position.y = 0.10 + Math.sin(clock.elapsedTime * 0.55) * 0.015
    }
  })

  // Column color transitions green → amber → red as health falls
  const columnColor = useMemo(() => {
    const c = new THREE.Color()
    if (health >= 0.75) {
      c.set('#00c8ff')
    } else if (health >= 0.5) {
      const t = (health - 0.5) / 0.25
      c.lerpColors(new THREE.Color('#f59e0b'), new THREE.Color('#00c8ff'), t)
    } else if (health >= 0.25) {
      const t = (health - 0.25) / 0.25
      c.lerpColors(new THREE.Color('#ef4444'), new THREE.Color('#f59e0b'), t)
    } else {
      c.set('#ef4444')
    }
    return c
  }, [health])

  const pillars = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2
      return { cx: Math.cos(a) * 0.9, cz: Math.sin(a) * 0.9 }
    }), [])

  const panels = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6
      return { cx: Math.cos(a) * 0.78, cz: Math.sin(a) * 0.78, rot: -a }
    }), [])

  return (
    <group>
      {/* Rounded altar base */}
      <mesh position={[0, -0.04, 0]}>
        <cylinderGeometry args={[1.30, 1.36, 0.20, 32]} />
        <meshStandardMaterial color={columnColor} emissive={columnColor} emissiveIntensity={0.07} metalness={0.45} roughness={0.58} />
      </mesh>
      {/* Top rim of altar — gives rounded-edge look */}
      <mesh position={[0, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.30, 0.062, 12, 44]} />
        <meshStandardMaterial color={columnColor} emissive={columnColor} emissiveIntensity={0.52} metalness={0.82} roughness={0.18} />
      </mesh>
      {/* Glow ring at base */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.22, 0.028, 6, 36]} />
        <meshStandardMaterial color={columnColor} emissive={columnColor} emissiveIntensity={0.7} />
      </mesh>

      {/* Health-colored pillars */}
      {pillars.map(({ cx, cz }, i) => (
        <mesh key={i} position={[cx, 0.46, cz]}>
          <cylinderGeometry args={[0.03, 0.03, 0.92, 6]} />
          <meshStandardMaterial color={columnColor} emissive={columnColor} emissiveIntensity={0.45} metalness={0.9} roughness={0.1} />
        </mesh>
      ))}

      {/* Glass wall panels */}
      {panels.map(({ cx, cz, rot }, i) => (
        <mesh key={i} position={[cx, 0.46, cz]} rotation={[0, rot, 0]}>
          <boxGeometry args={[0.9, 0.9, 0.02]} />
          <meshStandardMaterial color="#88ffee" transparent opacity={0.07} metalness={0.0} roughness={0.0} />
        </mesh>
      ))}

      {/* Top collar ring */}
      <mesh position={[0, 0.93, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.9, 0.025, 6, 36]} />
        <meshStandardMaterial color={columnColor} emissive={columnColor} emissiveIntensity={0.5} metalness={0.9} />
      </mesh>

      {/* Glass dome */}
      <mesh position={[0, 0.93, 0]}>
        <sphereGeometry args={[0.9, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#88ffee" transparent opacity={0.08} metalness={0.0} roughness={0.0} side={THREE.DoubleSide} />
      </mesh>

      {/* Dome latitude rings */}
      {([0.32, 0.7] as number[]).map((lat, i) => {
        const r = Math.sqrt(1 - lat * lat) * 0.9
        const h = 0.93 + lat * 0.9
        return (
          <mesh key={i} position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r, 0.018, 6, 28]} />
            <meshStandardMaterial color={columnColor} emissive={columnColor} emissiveIntensity={0.35} metalness={0.9} />
          </mesh>
        )
      })}

      {/* Lawn disc + stone path (static, outside hovering group) */}
      <mesh position={[0, 0.082, 0]}>
        <cylinderGeometry args={[0.70, 0.70, 0.016, 40]} />
        <meshStandardMaterial color="#1a6e28" roughness={0.96} metalness={0.0} />
      </mesh>
      {[0.38, 0.52, 0.64].map((z, i) => (
        <group key={i} position={[0, 0.092, z]}>
          <mesh>
            <boxGeometry args={[0.13, 0.022, 0.13]} />
            <meshStandardMaterial color="#8c8880" roughness={0.92} metalness={0.05} />
          </mesh>
          {/* Cross groove — horizontal */}
          <mesh position={[0, 0.013, 0]}>
            <boxGeometry args={[0.13, 0.006, 0.007]} />
            <meshStandardMaterial color="#6a6460" roughness={0.96} />
          </mesh>
          {/* Cross groove — vertical */}
          <mesh position={[0, 0.013, 0]}>
            <boxGeometry args={[0.007, 0.006, 0.13]} />
            <meshStandardMaterial color="#6a6460" roughness={0.96} />
          </mesh>
        </group>
      ))}

      {/* Minimalist floating house (foundation outside so it doesn't bob) */}
      <mesh position={[0, 0.092, 0]}>
        <boxGeometry args={[0.62, 0.018, 0.52]} />
        <meshStandardMaterial color="#8a7a68" roughness={0.9} metalness={0.05} />
      </mesh>
      <group ref={houseRef} position={[0, 0.10, 0]}>
        {/* Walls */}
        <mesh position={[0, 0.20, 0]}>
          <boxGeometry args={[0.54, 0.40, 0.44]} />
          <meshStandardMaterial color="#e5ddd0" roughness={0.82} metalness={0.0} emissive="#e5ddd0" emissiveIntensity={0.04} />
        </mesh>
        {/* Roof — 4-sided pyramid with proper overhang */}
        <mesh position={[0, 0.577, 0]} rotation={[0, Math.PI / 4, 0]}>
          <cylinderGeometry args={[0.01, 0.46, 0.36, 4]} />
          <meshStandardMaterial color="#8b3010" roughness={0.88} metalness={0.0} />
        </mesh>
        {/* Door (front wall only) */}
        <mesh position={[0, 0.13, 0.228]}>
          <boxGeometry args={[0.12, 0.23, 0.013]} />
          <meshStandardMaterial color="#6b4226" roughness={0.9} />
        </mesh>
        {/* Door handle */}
        <mesh position={[0.046, 0.13, 0.236]}>
          <sphereGeometry args={[0.013, 6, 6]} />
          <meshStandardMaterial color="#c9a227" metalness={0.85} roughness={0.15} />
        </mesh>
        {/* Door frame — left jamb, right jamb, top lintel */}
        <mesh position={[-0.068, 0.13, 0.229]}>
          <boxGeometry args={[0.016, 0.23, 0.014]} />
          <meshStandardMaterial color="#d4a96a" roughness={0.85} />
        </mesh>
        <mesh position={[0.068, 0.13, 0.229]}>
          <boxGeometry args={[0.016, 0.23, 0.014]} />
          <meshStandardMaterial color="#d4a96a" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.253, 0.229]}>
          <boxGeometry args={[0.152, 0.016, 0.014]} />
          <meshStandardMaterial color="#d4a96a" roughness={0.85} />
        </mesh>

        {/* Back wall window (width 0.27, height 0.09) */}
        <mesh position={[0, 0.23, -0.227]}>
          <boxGeometry args={[0.27, 0.09, 0.013]} />
          <meshStandardMaterial color="#aadeff" transparent opacity={0.72} roughness={0.04} metalness={0.06} />
        </mesh>
        <mesh position={[0, 0.23, -0.226]}>
          <boxGeometry args={[0.012, 0.09, 0.016]} />
          <meshStandardMaterial color="#c8bfb2" roughness={0.82} />
        </mesh>

        {/* Right wall window (width 0.27 in Z, height 0.09) */}
        <mesh position={[0.277, 0.23, 0]}>
          <boxGeometry args={[0.013, 0.09, 0.27]} />
          <meshStandardMaterial color="#aadeff" transparent opacity={0.72} roughness={0.04} metalness={0.06} />
        </mesh>
        <mesh position={[0.276, 0.23, 0]}>
          <boxGeometry args={[0.016, 0.09, 0.012]} />
          <meshStandardMaterial color="#c8bfb2" roughness={0.82} />
        </mesh>

        {/* Left wall window (width 0.27 in Z, height 0.09) */}
        <mesh position={[-0.277, 0.23, 0]}>
          <boxGeometry args={[0.013, 0.09, 0.27]} />
          <meshStandardMaterial color="#aadeff" transparent opacity={0.72} roughness={0.04} metalness={0.06} />
        </mesh>
        <mesh position={[-0.276, 0.23, 0]}>
          <boxGeometry args={[0.016, 0.09, 0.012]} />
          <meshStandardMaterial color="#c8bfb2" roughness={0.82} />
        </mesh>

        {/* Warm interior light */}
        <pointLight position={[0, 0.22, 0]} intensity={0.35} color="#ffe8b0" distance={1.2} decay={2} />
        {/* Wall bushes — one wide bush per wall (back, left, right) */}
        <mesh position={[0, 0.05, -0.27]}><boxGeometry args={[0.28, 0.10, 0.09]} /><meshStandardMaterial color="#2d7a3e" roughness={0.96} emissive="#1a4a25" emissiveIntensity={0.12} /></mesh>
        <mesh position={[-0.31, 0.05, 0]}><boxGeometry args={[0.09, 0.10, 0.28]} /><meshStandardMaterial color="#2d7a3e" roughness={0.96} emissive="#1a4a25" emissiveIntensity={0.12} /></mesh>
        <mesh position={[0.31, 0.05, 0]}><boxGeometry args={[0.09, 0.10, 0.28]} /><meshStandardMaterial color="#2d7a3e" roughness={0.96} emissive="#1a4a25" emissiveIntensity={0.12} /></mesh>
      </group>

      <pointLight position={[0, 1.0, 0]} intensity={0.65} color="#88ff88" distance={2.5} decay={2} />
    </group>
  )
}

// ── Starfield ─────────────────────────────────────────────────────────────────
function Stars() {
  const geometry = useMemo(() => {
    const positions = new Float32Array(500 * 3)
    for (let i = 0; i < 500; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 110
      positions[i * 3 + 1] = (Math.random() - 0.5) * 110
      positions[i * 3 + 2] = (Math.random() - 0.5) * 110
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])

  return (
    <points geometry={geometry}>
      <pointsMaterial size={0.09} color="#a0d8ef" sizeAttenuation />
    </points>
  )
}

// ── Space objects (planets, galaxy, comet) ────────────────────────────────────
function SpaceObjects() {
  const cometRef = useRef<THREE.Group>(null)

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

  useFrame(({ clock }) => {
    if (cometRef.current) {
      const t = clock.elapsedTime * 0.035
      cometRef.current.position.set(
        22 + Math.cos(t) * 14,
        9 + Math.sin(t * 0.38) * 4,
        -44
      )
    }
  })

  return (
    <group>
      {/* Planet 1 — Mars-like with ring */}
      <group position={[36, 9, -42]}>
        <mesh>
          <sphereGeometry args={[2.2, 26, 16]} />
          <meshStandardMaterial color="#c1440e" emissive="#6a1e02" emissiveIntensity={0.18} roughness={0.85} />
        </mesh>
        <mesh rotation={[0.38, 0, 0]}>
          <torusGeometry args={[3.9, 0.3, 2, 52]} />
          <meshStandardMaterial color="#a06030" transparent opacity={0.42} roughness={0.9} />
        </mesh>
        <pointLight intensity={0.07} color="#c1440e" distance={28} decay={1} />
      </group>

      {/* Planet 2 — ice blue */}
      <group position={[-40, -5, -36]}>
        <mesh>
          <sphereGeometry args={[1.5, 24, 16]} />
          <meshStandardMaterial color="#6ab0d4" emissive="#1a4060" emissiveIntensity={0.2} roughness={0.7} />
        </mesh>
        <pointLight intensity={0.05} color="#6ab0d4" distance={22} decay={1} />
      </group>

      {/* Planet 3 — purple gas giant */}
      <group position={[17, 26, -55]}>
        <mesh>
          <sphereGeometry args={[1.8, 24, 16]} />
          <meshStandardMaterial color="#7b4fa0" emissive="#2a0a40" emissiveIntensity={0.22} roughness={0.8} />
        </mesh>
      </group>

      {/* Spiral galaxy cluster */}
      <group position={[-52, 6, -68]} rotation={[0.25, 0.6, 0.1]}>
        <points geometry={galaxyGeo}>
          <pointsMaterial size={0.22} color="#c8a0ff" sizeAttenuation transparent opacity={0.6} />
        </points>
      </group>

      {/* Comet with glowing head + transparent tail */}
      <group ref={cometRef}>
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

// ── Scene root ─────────────────────────────────────────────────────────────────
export default function SimulatorScene() {
  const state = useSimStore((s) => s.state)
  const setSelected = useSimStore((s) => s.setSelectedVector)

  if (!state) return null

  // Greenhouse health driven by overall session progress (0 → 1)
  const health = state.progress / 100

  return (
    <Canvas
      camera={{ position: [0, 5.5, 8.5], fov: 50 }}
      gl={{ antialias: true }}
      style={{ position: 'absolute', inset: 0, background: '#050e14' }}
    >
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 8, 0]} intensity={1.6} color="#00c8ff" />
      <pointLight position={[6, 4, 6]} intensity={0.5} color="#3b82f6" />
      <pointLight position={[-6, 3, -4]} intensity={0.3} color="#6366f1" />

      <Stars />
      <SpaceObjects />
      <Greenhouse health={health} />

      {PLATFORMS.map((p) => (
        <Platform
          key={p.id}
          def={p}
          vectors={state.vectors}
          onClick={() => setSelected(p.id)}
        />
      ))}

      <gridHelper args={[22, 22, '#0d2535', '#0d2535']} position={[0, -0.18, 0]} />

      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={16}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        autoRotate
        autoRotateSpeed={0.18}
      />
    </Canvas>
  )
}
