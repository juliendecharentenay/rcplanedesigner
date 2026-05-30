import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import AirfoilPanel from './AirfoilPanel.vue'
import { AIRFOILS_KEY } from '../composables/useAirfoils'
import { APP_STATE_KEY } from '../composables/useAppState'
import { FOCUSED_PARAM_KEY } from '../composables/useFocusedParam'

const MOCK_AIRFOILS = [
  { profileName: 'E168 (12%)', zeroLiftAoA: 0,    stall_aoa: 11, stall_clmax: 1.047, polar: [] },
  { profileName: 'E169 (14%)', zeroLiftAoA: -1.5,  stall_aoa: 13, stall_clmax: 1.1,   polar: [] },
]

function mountPanel({ airfoilProfile = null, focusedKey = ref('airfoilProfile') } = {}) {
  const state = ref({ airfoilProfile })
  const setState = vi.fn((partial) => { state.value = { ...state.value, ...partial } })
  const wrapper = mount(AirfoilPanel, {
    global: {
      provide: {
        [AIRFOILS_KEY]: { airfoils: MOCK_AIRFOILS },
        [APP_STATE_KEY]: { getState: () => state.value, setState },
        [FOCUSED_PARAM_KEY]: { focusedKey },
      },
    },
  })
  return { wrapper, setState }
}

describe('AirfoilPanel', () => {
  it('renders an <aside> element', () => {
    expect(mountPanel().wrapper.find('aside').exists()).toBe(true)
  })

  it('is visible when airfoilProfile parameter is focused', () => {
    expect(mountPanel({ focusedKey: ref('airfoilProfile') }).wrapper.find('aside').isVisible()).toBe(true)
  })

  it('is hidden when a different parameter is focused', () => {
    expect(mountPanel({ focusedKey: ref('siteAltitude') }).wrapper.find('aside').isVisible()).toBe(false)
  })

  it('is hidden when no parameter is focused', () => {
    expect(mountPanel({ focusedKey: ref(null) }).wrapper.find('aside').isVisible()).toBe(false)
  })

  it('shows a table when no airfoil is selected', () => {
    expect(mountPanel({ airfoilProfile: null }).wrapper.find('table').exists()).toBe(true)
  })

  it('table has Profile, Zero Lift AoA, Stall AoA, and Stall Cl column headers', () => {
    const { wrapper } = mountPanel()
    const text = wrapper.text()
    expect(text).toContain('Profile')
    expect(text).toContain('Zero Lift AoA')
    expect(text).toContain('Stall AoA')
    expect(text).toContain('Stall Cl')
  })

  it('lists all airfoil profile names in the table', () => {
    const { wrapper } = mountPanel()
    const text = wrapper.text()
    expect(text).toContain('E168 (12%)')
    expect(text).toContain('E169 (14%)')
  })

  it('displays zero lift AoA formatted to 2 decimal places', () => {
    const { wrapper } = mountPanel()
    const text = wrapper.text()
    expect(text).toContain('0.00')
    expect(text).toContain('-1.50')
  })

  it('displays stall AoA for each airfoil', () => {
    const { wrapper } = mountPanel()
    const text = wrapper.text()
    expect(text).toContain('11')
    expect(text).toContain('13')
  })

  it('displays stall Cl formatted to 3 decimal places', () => {
    const { wrapper } = mountPanel()
    const text = wrapper.text()
    expect(text).toContain('1.047')
    expect(text).toContain('1.100')
  })

  it('highlights the selected airfoil row', () => {
    const { wrapper } = mountPanel({ airfoilProfile: 'E168 (12%)' })
    const rows = wrapper.findAll('tbody tr')
    expect(rows[0].classes()).toContain('bg-sky-50')
    expect(rows[1].classes()).not.toContain('bg-sky-50')
  })

  it('has an "Airfoil" heading in the panel header', () => {
    expect(mountPanel().wrapper.text()).toContain('Airfoil')
  })

  it('clicking a row calls setState with that profile name', async () => {
    const { wrapper, setState } = mountPanel()
    await wrapper.findAll('tbody tr')[1].trigger('click')
    expect(setState).toHaveBeenCalledWith({ airfoilProfile: 'E169 (14%)' })
  })

  it('clicking the first row selects the first profile', async () => {
    const { wrapper, setState } = mountPanel()
    await wrapper.findAll('tbody tr')[0].trigger('click')
    expect(setState).toHaveBeenCalledWith({ airfoilProfile: 'E168 (12%)' })
  })

  it('rows have cursor-pointer style', () => {
    const { wrapper } = mountPanel()
    wrapper.findAll('tbody tr').forEach((row) => {
      expect(row.classes()).toContain('cursor-pointer')
    })
  })
})
