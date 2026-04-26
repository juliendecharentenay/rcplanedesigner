import { Matrix4, Vector3, Euler, Quaternion } from 'three'

export function cpacsTransformToMatrix4(t) {
  const translation = new Vector3(t.translation.x, t.translation.y, t.translation.z)
  const euler = new Euler(
    t.rotation.x * Math.PI / 180,
    t.rotation.y * Math.PI / 180,
    t.rotation.z * Math.PI / 180,
    'XYZ'
  )
  const quaternion = new Quaternion().setFromEuler(euler)
  const scale = new Vector3(t.scaling.x, t.scaling.y, t.scaling.z)
  return new Matrix4().compose(translation, quaternion, scale)
}

export function composeElementMatrix(wingT, sectionT, elementT) {
  const mw = cpacsTransformToMatrix4(wingT)
  const ms = cpacsTransformToMatrix4(sectionT)
  const me = cpacsTransformToMatrix4(elementT)
  return mw.multiply(ms).multiply(me)
}

export function symmetryMatrix(symmetry) {
  if (symmetry === 'x-z-plane') return new Matrix4().makeScale(1, -1, 1)
  if (symmetry === 'x-y-plane') return new Matrix4().makeScale(1, 1, -1)
  if (symmetry === 'y-z-plane') return new Matrix4().makeScale(-1, 1, 1)
  return null
}
