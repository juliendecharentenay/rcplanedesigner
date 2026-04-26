import { Vector3, BufferGeometry, BufferAttribute } from 'three'

export function extractProfile(airfoil, matrix4) {
  const { x, y, z } = airfoil.pointList
  return x.map((xi, i) => new Vector3(xi, y[i], z[i]).applyMatrix4(matrix4))
}

export function resampleByArcLength(points, N = 64) {
  const n = points.length
  const arcLen = [0]
  for (let i = 0; i < n; i++) {
    arcLen.push(arcLen[i] + points[i].distanceTo(points[(i + 1) % n]))
  }
  const total = arcLen[n]
  const result = []
  for (let k = 0; k < N; k++) {
    const target = (k / N) * total
    let lo = 0, hi = n - 1
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1
      if (arcLen[mid] <= target) lo = mid; else hi = mid
    }
    const t = (target - arcLen[lo]) / (arcLen[lo + 1] - arcLen[lo])
    result.push(new Vector3().lerpVectors(points[lo], points[lo + 1], t))
  }
  return result
}

export function loftProfiles(profileA, profileB) {
  const N = profileA.length
  const positions = new Float32Array((N * 2 + 2) * 3)
  for (let i = 0; i < N; i++) {
    positions[i * 3]             = profileA[i].x
    positions[i * 3 + 1]         = profileA[i].y
    positions[i * 3 + 2]         = profileA[i].z
    positions[(N + i) * 3]       = profileB[i].x
    positions[(N + i) * 3 + 1]   = profileB[i].y
    positions[(N + i) * 3 + 2]   = profileB[i].z
  }

  const centA = new Vector3()
  const centB = new Vector3()
  for (let i = 0; i < N; i++) { centA.add(profileA[i]); centB.add(profileB[i]) }
  centA.divideScalar(N); centB.divideScalar(N)
  const cA = N * 2, cB = N * 2 + 1
  positions[cA * 3] = centA.x; positions[cA * 3 + 1] = centA.y; positions[cA * 3 + 2] = centA.z
  positions[cB * 3] = centB.x; positions[cB * 3 + 1] = centB.y; positions[cB * 3 + 2] = centB.z

  const totalTris = N * 2 + (N - 2) * 2
  const indices = new Uint32Array(totalTris * 3)
  let idx = 0

  for (let i = 0; i < N; i++) {
    const a = i, b = (i + 1) % N, c = N + i, d = N + (i + 1) % N
    indices[idx++] = a; indices[idx++] = c; indices[idx++] = b
    indices[idx++] = b; indices[idx++] = c; indices[idx++] = d
  }
  for (let i = 1; i < N - 1; i++) {
    indices[idx++] = cA; indices[idx++] = i + 1; indices[idx++] = i
  }
  for (let i = 1; i < N - 1; i++) {
    indices[idx++] = cB; indices[idx++] = N + i; indices[idx++] = N + i + 1
  }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(positions, 3))
  geo.setIndex(new BufferAttribute(indices, 1))
  geo.computeVertexNormals()
  return geo
}
