import { describe, it, expect } from 'vitest'
import { buildXml } from './buildXml.js'

function makeAircraft() {
  return {
    information: { name: 'Test Aircraft', version: '1.0.0', creator: 'Tester' },
    wings: [
      {
        name: 'main wing',
        transform: {
          rotation: { x: 0, y: 0, z: 0 },
          scaling: { x: 1, y: 1, z: 1 },
          translation: { x: 0, y: 0, z: 0 },
        },
        elements: [
          {
            airfoilUid: 'NACA0009',
            transform: {
              rotation: { x: 0, y: 0, z: 0 },
              scaling: { x: 1, y: 1, z: 1 },
              translation: { x: 0, y: 0, z: 0 },
            },
          },
          {
            airfoilUid: 'NACA0009',
            transform: {
              rotation: { x: 0, y: 0, z: 0 },
              scaling: { x: 0.5, y: 1, z: 0.5 },
              translation: { x: 0.5, y: 1.0, z: 0 },
            },
          },
        ],
      },
    ],
  }
}

describe('buildXml', () => {
  it('outputs a valid CPACS 3.5 root element', () => {
    const xml = buildXml(makeAircraft())
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('<cpacs ')
    expect(xml).toContain('<cpacsVersion>3.5</cpacsVersion>')
  })

  it('includes aircraft header information', () => {
    const xml = buildXml(makeAircraft())
    expect(xml).toContain('<name>Test Aircraft</name>')
    expect(xml).toContain('<version>1.0.0</version>')
    expect(xml).toContain('<creator>Tester</creator>')
  })

  it('generates correct wing and section UIDs', () => {
    const xml = buildXml(makeAircraft())
    expect(xml).toContain('uID="wing1"')
    expect(xml).toContain('uID="wing1section1"')
    expect(xml).toContain('uID="wing1section2"')
    expect(xml).toContain('uID="wing1section1element1"')
    expect(xml).toContain('uID="wing1section2element1"')
  })

  it('places element transforms at section level with identity element transform', () => {
    const xml = buildXml(makeAircraft())
    expect(xml).toContain('<airfoilUID>NACA0009</airfoilUID>')
    expect(xml).toContain('<transformation/>')
  })

  it('auto-generates a segment connecting the two sections', () => {
    const xml = buildXml(makeAircraft())
    expect(xml).toContain('uID="wing1segment1"')
    expect(xml).toContain('<fromElementUID>wing1section1element1</fromElementUID>')
    expect(xml).toContain('<toElementUID>wing1section2element1</toElementUID>')
  })

  it('includes wingAirfoil profile for NACA0009', () => {
    const xml = buildXml(makeAircraft())
    expect(xml).toContain('<wingAirfoil uID="NACA0009">')
    expect(xml).toContain('<name>NACA0009 Airfoil</name>')
  })

  it('formats pointList as semicolon-separated values', () => {
    const xml = buildXml(makeAircraft())
    expect(xml).toMatch(/<x>[0-9.;-]+<\/x>/)
    expect(xml).toMatch(/<z>[0-9.;-]+<\/z>/)
    // no commas in pointList
    const pointListSection = xml.slice(xml.indexOf('<pointList>'), xml.indexOf('</pointList>') + 12)
    expect(pointListSection).not.toContain(',')
  })

  it('deduplicates airfoil profiles when same airfoil used multiple times', () => {
    const xml = buildXml(makeAircraft())
    const count = (xml.match(/wingAirfoil uID="NACA0009"/g) || []).length
    expect(count).toBe(1)
  })

  it('produces no segments for a wing with a single element', () => {
    const ac = makeAircraft()
    ac.wings[0].elements = [ac.wings[0].elements[0]]
    const xml = buildXml(ac)
    expect(xml).not.toContain('<segment ')
  })
})
