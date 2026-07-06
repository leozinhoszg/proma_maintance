import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/** Geometria de engrenagem: perfil dentado extrudado com furo central. */
function gearGeometry(teeth: number, rOuter: number, rInner: number, depth: number) {
  const shape = new THREE.Shape()
  const step = (Math.PI * 2) / teeth
  for (let i = 0; i < teeth; i++) {
    const a = i * step
    const p = (f: number, r: number) =>
      [Math.cos(a + step * f) * r, Math.sin(a + step * f) * r] as const
    const [x0, y0] = p(0, rInner)
    if (i === 0) shape.moveTo(x0, y0)
    else shape.lineTo(x0, y0)
    shape.lineTo(...p(0.15, rOuter))
    shape.lineTo(...p(0.45, rOuter))
    shape.lineTo(...p(0.6, rInner))
  }
  shape.closePath()
  const hole = new THREE.Path()
  hole.absarc(0, 0, rInner * 0.4, 0, Math.PI * 2, true)
  shape.holes.push(hole)
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 6 })
}

/** Par de engrenagens wireframe engrenadas, em âmbar sobre grafite. */
export function GearCanvas() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    camera.position.set(0, 0, 9)

    // WebGL pode não existir (navegador antigo, ambiente de teste) — degrada sem quebrar
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    const amber = new THREE.LineBasicMaterial({ color: 0xffb300, transparent: true, opacity: 0.75 })
    const slate = new THREE.LineBasicMaterial({ color: 0x3a4a5e, transparent: true, opacity: 0.55 })

    const makeGear = (teeth: number, rO: number, rI: number, mat: THREE.LineBasicMaterial) => {
      const geo = gearGeometry(teeth, rO, rI, 0.5)
      const wire = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 12), mat)
      geo.dispose()
      return wire
    }

    // engrenagem principal (âmbar) + secundária (aço), engrenadas
    const g1 = makeGear(14, 2.6, 2.1, amber)
    g1.position.set(-1.15, 0.35, 0)
    const g2 = makeGear(9, 1.7, 1.32, slate)
    g2.position.set(2.75, -1.4, -0.4)
    g2.rotation.z = Math.PI / 9
    scene.add(g1, g2)

    // poeira de oficina: partículas discretas
    const pGeo = new THREE.BufferGeometry()
    const pos = new Float32Array(90 * 3)
    for (let i = 0; i < pos.length; i++) pos[i] = (Math.random() - 0.5) * 14
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const dust = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({ color: 0x5a6878, size: 0.035, transparent: true, opacity: 0.6 }),
    )
    scene.add(dust)

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(mount)

    const reduzMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const tick = () => {
      // razão de transmissão 14:9 — as duas giram como engrenadas de verdade
      g1.rotation.z += 0.0035
      g2.rotation.z -= 0.0035 * (14 / 9)
      dust.rotation.y += 0.0004
      renderer.render(scene, camera)
      raf = requestAnimationFrame(tick)
    }
    if (reduzMotion) {
      renderer.render(scene, camera) // quadro único, sem animação
    } else {
      tick()
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      renderer.dispose()
      pGeo.dispose()
      amber.dispose()
      slate.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div className="gear-frame" ref={mountRef} aria-hidden="true">
      <span className="gear-caption">transmissão 14:9 · monitoramento ativo</span>
    </div>
  )
}
