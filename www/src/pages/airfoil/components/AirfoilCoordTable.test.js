import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AirfoilCoordTable from './AirfoilCoordTable.vue'

const MOCK_AIRFOIL = {
  profileName: 'E168 (12.45%)',
  coord: {
    x: [1.0, 0.99649, 0.98631, 0.0, 0.98631, 0.99649, 1.0],
    y: [0.0,  0.00021, 0.00108, 0.0, -0.00108, -0.00021, 0.0],
  },
}

const MOCK_AIRFOIL_61 = {
  profileName: 'E168 (12.45%)',
  coord: {
    x: Array.from({ length: 61 }, (_, i) => i < 31 ? 1 - i * (1 / 30) : (i - 30) * (1 / 30)),
    y: Array.from({ length: 61 }, (_, i) => i < 31 ? i * 0.002 : -(i - 30) * 0.002),
  },
}

function mountTable(props = {}) {
  return mount(AirfoilCoordTable, { props })
}

describe('AirfoilCoordTable', () => {
  it('mounts without error when airfoil is null', () => {
    expect(() => mountTable({ airfoil: null })).not.toThrow()
  })

  it('renders no rows when airfoil is null', () => {
    const wrapper = mountTable({ airfoil: null })
    expect(wrapper.findAll('tbody tr')).toHaveLength(0)
  })

  it('shows column headers X and Y', () => {
    const wrapper = mountTable({ airfoil: MOCK_AIRFOIL })
    const headerText = wrapper.find('thead').text()
    expect(headerText).toContain('X')
    expect(headerText).toContain('Y')
  })

  it('renders a row for each coordinate point', () => {
    const wrapper = mountTable({ airfoil: MOCK_AIRFOIL })
    expect(wrapper.findAll('tbody tr')).toHaveLength(MOCK_AIRFOIL.coord.x.length)
  })

  it('renders 61 rows for a 61-point airfoil', () => {
    const wrapper = mountTable({ airfoil: MOCK_AIRFOIL_61 })
    expect(wrapper.findAll('tbody tr')).toHaveLength(61)
  })

  it('formats coordinate values to 2 decimal places', () => {
    const wrapper = mountTable({ airfoil: MOCK_AIRFOIL })
    const firstRow = wrapper.findAll('tbody tr')[0]
    const cells = firstRow.findAll('td')
    expect(cells[0].text()).toBe('1.00')
    expect(cells[1].text()).toBe('0.00')
  })

  it('formats negative values to 2 decimal places', () => {
    const wrapper = mountTable({ airfoil: MOCK_AIRFOIL })
    const lastRow = wrapper.findAll('tbody tr').at(-1)
    const cells = lastRow.findAll('td')
    expect(cells[0].text()).toBe('1.00')
    expect(cells[1].text()).toBe('0.00')
  })

  it('formats a non-zero y value to 2 decimal places', () => {
    const airfoil = {
      profileName: 'Test',
      coord: { x: [0.5], y: [-0.06221] },
    }
    const wrapper = mountTable({ airfoil })
    const cell = wrapper.findAll('tbody tr')[0].findAll('td')[1]
    expect(cell.text()).toBe('-0.06')
  })
})
