import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AxisGizmo from './AxisGizmo.vue'

const defaultAxes = {
  x: { ex: 82, ey: 50, lx: 90, ly: 50 },
  y: { ex: 50, ey: 82, lx: 50, ly: 90 },
  z: { ex: 50, ey: 18, lx: 50, ly: 10 },
}

function mountGizmo(axes = defaultAxes) {
  return mount(AxisGizmo, { props: { axes } })
}

describe('AxisGizmo', () => {
  it('renders three axis lines', () => {
    const wrapper = mountGizmo()
    const lines = wrapper.findAll('line')
    expect(lines).toHaveLength(3)
  })

  it('renders X, Y, Z labels', () => {
    const wrapper = mountGizmo()
    const texts = wrapper.findAll('text')
    const labels = texts.map(t => t.text())
    expect(labels).toEqual(['X', 'Y', 'Z'])
  })

  it('positions X line endpoint from axes prop', () => {
    const wrapper = mountGizmo()
    const [xLine] = wrapper.findAll('line')
    expect(Number(xLine.attributes('x2'))).toBe(defaultAxes.x.ex)
    expect(Number(xLine.attributes('y2'))).toBe(defaultAxes.x.ey)
  })

  it('positions labels from axes prop', () => {
    const wrapper = mountGizmo()
    const [xText, yText, zText] = wrapper.findAll('text')
    expect(Number(xText.attributes('x'))).toBe(defaultAxes.x.lx)
    expect(Number(yText.attributes('x'))).toBe(defaultAxes.y.lx)
    expect(Number(zText.attributes('x'))).toBe(defaultAxes.z.lx)
  })

  it('emits snap with "x" when X label is clicked', async () => {
    const wrapper = mountGizmo()
    await wrapper.findAll('text')[0].trigger('click')
    expect(wrapper.emitted('snap')).toEqual([['x']])
  })

  it('emits snap with "y" when Y label is clicked', async () => {
    const wrapper = mountGizmo()
    await wrapper.findAll('text')[1].trigger('click')
    expect(wrapper.emitted('snap')).toEqual([['y']])
  })

  it('emits snap with "z" when Z label is clicked', async () => {
    const wrapper = mountGizmo()
    await wrapper.findAll('text')[2].trigger('click')
    expect(wrapper.emitted('snap')).toEqual([['z']])
  })

  it('updates line endpoints when axes prop changes', async () => {
    const wrapper = mountGizmo()
    const newAxes = {
      x: { ex: 10, ey: 20, lx: 5, ly: 15 },
      y: { ex: 30, ey: 40, lx: 25, ly: 35 },
      z: { ex: 60, ey: 70, lx: 65, ly: 75 },
    }
    await wrapper.setProps({ axes: newAxes })
    const [xLine] = wrapper.findAll('line')
    expect(Number(xLine.attributes('x2'))).toBe(newAxes.x.ex)
    expect(Number(xLine.attributes('y2'))).toBe(newAxes.x.ey)
  })
})
