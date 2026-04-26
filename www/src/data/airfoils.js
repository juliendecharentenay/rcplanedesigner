function thickness(x, t) {
  return (t / 0.2) * (
    0.2969 * Math.sqrt(x)
    - 0.1260 * x
    - 0.3516 * x * x
    + 0.2843 * x * x * x
    - 0.1015 * x * x * x * x
  )
}

function camber(x, m, p) {
  if (m === 0 || p === 0) return { yc: 0, dyc: 0 }
  if (x <= p) return { yc: (m / (p * p)) * (2 * p * x - x * x), dyc: (2 * m / (p * p)) * (p - x) }
  return { yc: (m / ((1 - p) * (1 - p))) * (1 - 2 * p + 2 * p * x - x * x), dyc: (2 * m / ((1 - p) * (1 - p))) * (p - x) }
}

function generateNaca4(code) {
  const m = parseInt(code[0]) / 100
  const p = parseInt(code[1]) / 10
  const t = parseInt(code.slice(2)) / 100
  const N = 34

  const xs = Array.from({ length: N + 1 }, (_, i) =>
    +(0.5 * (1 - Math.cos(Math.PI * i / N))).toFixed(5)
  )

  const surface = (x, sign) => {
    const yt = thickness(x, t)
    const { yc, dyc } = camber(x, m, p)
    const theta = Math.atan(dyc)
    return {
      x: +(x - sign * yt * Math.sin(theta)).toFixed(5),
      z: +(yc + sign * yt * Math.cos(theta)).toFixed(5)
    }
  }

  // upper: TE→LE, lower: LE(excl.)→TE
  const upper = [...xs].reverse().map(x => surface(x, 1))
  const lower = xs.slice(1).map(x => surface(x, -1))
  const all = [...upper, ...lower]

  return {
    x: all.map(p => p.x),
    y: all.map(() => 0),
    z: all.map(p => p.z)
  }
}

export const airfoils = [
  {
    uID: 'NACA0009',
    name: 'NACA0009 Airfoil',
    description: 'NACA 4-digit symmetrical airfoil with a thickness of 9%',
    pointList: generateNaca4('0009')
  },
  {
    uID: 'NACA2412',
    name: 'NACA2412 Airfoil',
    description: 'NACA 4-digit cambered airfoil — 2% camber, max at 40% chord, 12% thickness',
    pointList: generateNaca4('2412')
  },
  {
    uID: 'NACA4412',
    name: 'NACA4412 Airfoil',
    description: 'NACA 4-digit cambered airfoil — 4% camber, max at 40% chord, 12% thickness',
    pointList: generateNaca4('4412')
  },
  {
    uID: 'NACA0012',
    name: 'NACA0012 Airfoil',
    description: 'NACA 4-digit symmetrical airfoil with a thickness of 12%',
    pointList: generateNaca4('0012')
  }
]
