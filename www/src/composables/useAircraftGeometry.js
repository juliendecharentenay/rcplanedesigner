import { watchEffect, onUnmounted } from 'vue'
import { Group, MeshPhongMaterial, Mesh, DoubleSide } from 'three'
import { airfoils } from '@/data/airfoils.js'
import { composeElementMatrix } from '@/utils/transforms.js'
import { extractProfile, resampleByArcLength, loftProfiles } from '@/utils/airfoilGeometry.js'

const material = new MeshPhongMaterial({ color: 0x4a90d9, side: DoubleSide, shininess: 60 })

const identityTransform = {
  rotation: { x: 0, y: 0, z: 0 },
  scaling: { x: 1, y: 1, z: 1 },
  translation: { x: 0, y: 0, z: 0 }
}

function findAirfoil(uid) {
  return airfoils.find(a => a.uID === uid) ?? airfoils[0]
}

function buildWingGroup(wing) {
  const group = new Group()
  const geometries = []
  const elements = wing.elements

  for (let i = 0; i < elements.length - 1; i++) {
    const elA = elements[i]
    const elB = elements[i + 1]

    const matA = composeElementMatrix(wing.transform, identityTransform, elA.transform)
    const matB = composeElementMatrix(wing.transform, identityTransform, elB.transform)

    const profA = resampleByArcLength(extractProfile(findAirfoil(elA.airfoilUid), matA))
    const profB = resampleByArcLength(extractProfile(findAirfoil(elB.airfoilUid), matB))

    const geo = loftProfiles(profA, profB)
    geometries.push(geo)
    group.add(new Mesh(geo, material))
  }

  return { group, geometries }
}

export function useAircraftGeometry(scene, aircraftRef) {
  let wingGroups = []

  function dispose() {
    wingGroups.forEach(({ group, geometries }) => {
      scene.remove(group)
      geometries.forEach(g => g.dispose())
    })
    wingGroups = []
  }

  const stop = watchEffect(() => {
    JSON.stringify(aircraftRef.value)

    dispose()

    aircraftRef.value.wings.forEach(wing => {
      const { group, geometries } = buildWingGroup(wing)
      scene.add(group)
      wingGroups.push({ group, geometries })
    })
  })

  function setWireframe(val) {
    material.wireframe = val
  }

  onUnmounted(() => {
    stop()
    dispose()
  })

  return { setWireframe }
}
