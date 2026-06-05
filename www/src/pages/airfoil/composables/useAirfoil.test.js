import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { useAirfoil, AIRFOIL_KEY } from './useAirfoil'

const MOCK_AIRFOIL_VALUE = {
  airfoilList: [{ value: 'E168 (12%)', label: 'E168 (12%)' }],
  selectedAirfoilData: { profileName: 'E168 (12%)' },
  setSelectedAirfoil: () => {},
}

function mountWithProvide(provided) {
  let result
  mount(
    {
      setup() {
        result = useAirfoil()
        return () => null
      },
    },
    { global: { provide: provided } },
  )
  return result
}

describe('useAirfoil', () => {
  it('exports AIRFOIL_KEY as a Symbol', () => {
    expect(typeof AIRFOIL_KEY).toBe('symbol')
  })

  it('returns the value provided under AIRFOIL_KEY', () => {
    const result = mountWithProvide({ [AIRFOIL_KEY]: MOCK_AIRFOIL_VALUE })
    expect(result).toBe(MOCK_AIRFOIL_VALUE)
  })

  it('returns undefined when no provider is present', () => {
    const result = mountWithProvide({})
    expect(result).toBeUndefined()
  })
})
