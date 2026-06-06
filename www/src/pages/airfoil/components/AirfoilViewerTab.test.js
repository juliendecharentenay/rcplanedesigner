import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import AirfoilViewerTab from './AirfoilViewerTab.vue'
import { AIRFOIL_KEY } from '../composables/useAirfoil'

const MOCK_AIRFOIL = {
  profileName: 'E168 (12.45%)',
  coord: {
    x: [1.0, 0.5, 0.0, 0.5, 1.0],
    y: [0.0, 0.05, 0.0, -0.05, 0.0],
  },
}

const STUBS = {
  AirfoilProfileChart: {
    name: 'AirfoilProfileChart',
    template: '<div class="stub-profile-chart" />',
    props: ['airfoil'],
  },
  AirfoilCoordTable: {
    name: 'AirfoilCoordTable',
    template: '<div class="stub-coord-table" />',
    props: ['airfoil'],
  },
}

function makeProvide(airfoil = null) {
  return {
    [AIRFOIL_KEY]: {
      airfoilList: [],
      selectedAirfoilData: ref(airfoil),
      setSelectedAirfoil: () => {},
    },
  }
}

function mountTab(airfoil = null) {
  return mount(AirfoilViewerTab, {
    global: {
      provide: makeProvide(airfoil),
      stubs: STUBS,
    },
  })
}

describe('AirfoilViewerTab', () => {
  it('mounts without error', () => {
    expect(() => mountTab()).not.toThrow()
  })

  it('shows empty-state message when no airfoil is selected', () => {
    const wrapper = mountTab(null)
    expect(wrapper.text()).toContain('Select an airfoil')
  })

  it('does not render AirfoilProfileChart when airfoil is null', () => {
    expect(mountTab(null).find('.stub-profile-chart').exists()).toBe(false)
  })

  it('does not render AirfoilCoordTable when airfoil is null', () => {
    expect(mountTab(null).find('.stub-coord-table').exists()).toBe(false)
  })

  it('renders AirfoilProfileChart when airfoil is provided', () => {
    expect(mountTab(MOCK_AIRFOIL).find('.stub-profile-chart').exists()).toBe(true)
  })

  it('renders AirfoilCoordTable when airfoil is provided', () => {
    expect(mountTab(MOCK_AIRFOIL).find('.stub-coord-table').exists()).toBe(true)
  })

  it('passes airfoil prop to AirfoilProfileChart', () => {
    const wrapper = mountTab(MOCK_AIRFOIL)
    const chart = wrapper.findComponent({ name: 'AirfoilProfileChart' })
    expect(chart.props('airfoil')).toEqual(MOCK_AIRFOIL)
  })

  it('passes airfoil prop to AirfoilCoordTable', () => {
    const wrapper = mountTab(MOCK_AIRFOIL)
    const table = wrapper.findComponent({ name: 'AirfoilCoordTable' })
    expect(table.props('airfoil')).toEqual(MOCK_AIRFOIL)
  })
})
