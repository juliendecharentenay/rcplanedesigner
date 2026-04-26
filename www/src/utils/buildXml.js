import { airfoils } from '@/data/airfoils.js'

function xmlTransform(t, indent) {
  const pad = ' '.repeat(indent)
  return `${pad}<transformation>
${pad}    <rotation>
${pad}        <x>${t.rotation.x}</x>
${pad}        <y>${t.rotation.y}</y>
${pad}        <z>${t.rotation.z}</z>
${pad}    </rotation>
${pad}    <scaling>
${pad}        <x>${t.scaling.x}</x>
${pad}        <y>${t.scaling.y}</y>
${pad}        <z>${t.scaling.z}</z>
${pad}    </scaling>
${pad}    <translation>
${pad}        <x>${t.translation.x}</x>
${pad}        <y>${t.translation.y}</y>
${pad}        <z>${t.translation.z}</z>
${pad}    </translation>
${pad}</transformation>`
}

export function buildXml(aircraft) {
  const info = aircraft.information
  const ts = new Date().toISOString()
  const modelUid = info.name || 'aircraft'

  const wingsXml = aircraft.wings.map((wing, wi) => {
    const wUid = `wing${wi + 1}`

    const sectionsXml = wing.elements.map((el, si) => {
      const sUid = `${wUid}section${si + 1}`
      const eUid = `${sUid}element1`
      return `                <section uID="${sUid}">
                    <name>section ${si + 1}</name>
${xmlTransform(el.transform, 20)}
                    <elements>
                        <element uID="${eUid}">
                            <name>element ${si + 1}</name>
                            <airfoilUID>${el.airfoilUid}</airfoilUID>
                            <transformation/>
                        </element>
                    </elements>
                </section>`
    }).join('\n')

    const segmentsXml = wing.elements.slice(0, -1).map((_, si) => {
      const fromUid = `${wUid}section${si + 1}element1`
      const toUid = `${wUid}section${si + 2}element1`
      return `                <segment uID="${wUid}segment${si + 1}">
                    <name>segment ${si + 1}</name>
                    <fromElementUID>${fromUid}</fromElementUID>
                    <toElementUID>${toUid}</toElementUID>
                </segment>`
    }).join('\n')

    return `            <wing uID="${wUid}">
                <name>${wing.name}</name>
${xmlTransform(wing.transform, 16)}
                <sections>
${sectionsXml}
                </sections>
                <segments>
${segmentsXml}
                </segments>
            </wing>`
  }).join('\n')

  const usedAirfoilUids = [...new Set(
    aircraft.wings.flatMap(w => w.elements.map(e => e.airfoilUid))
  )]
  const profilesXml = usedAirfoilUids.map(uid => {
    const af = airfoils.find(a => a.uID === uid)
    if (!af) return ''
    const { x, y, z } = af.pointList
    return `            <wingAirfoil uID="${af.uID}">
                <name>${af.name}</name>
                <description>${af.description}</description>
                <pointList>
                    <x>${x.join(';')}</x>
                    <y>${y.join(';')}</y>
                    <z>${z.join(';')}</z>
                </pointList>
            </wingAirfoil>`
  }).filter(Boolean).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<cpacs xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xsi:noNamespaceSchemaLocation="../schema/cpacs_schema.xsd">
    <header>
        <name>${info.name}</name>
        <version>${info.version}</version>
        <cpacsVersion>3.5</cpacsVersion>
        <versionInfos>
            <versionInfo version="${info.version}">
                <creator>${info.creator}</creator>
                <timestamp>${ts}</timestamp>
                <description>Create initial data set</description>
                <cpacsVersion>3.5</cpacsVersion>
            </versionInfo>
        </versionInfos>
    </header>
    <vehicles>
        <aircraft>
            <model uID="${modelUid}">
                <name>${info.name}</name>
                <wings>
${wingsXml}
                </wings>
            </model>
        </aircraft>
        <profiles>
            <wingAirfoils>
${profilesXml}
            </wingAirfoils>
        </profiles>
    </vehicles>
</cpacs>`
}
