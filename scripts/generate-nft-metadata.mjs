import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const source = await readFile(new URL('../src/game/data.ts', import.meta.url), 'utf8')
const envFile = await readFile(resolve('.env'), 'utf8').catch(() => '')
const envValue = envFile.match(/^\s*VITE_PUBLIC_URL\s*=\s*(.*)\s*$/m)?.[1]?.replace(/^['"]|['"]$/g, '')
const publicUrl = (process.env.VITE_PUBLIC_URL || envValue || 'https://feni-game.example').replace(/\/$/, '')
const output = resolve('public/nft/planets')
await mkdir(output, { recursive: true })
await Promise.all((await readdir(output)).filter((file) => /\.(json|svg)$/.test(file)).map((file) => rm(resolve(output, file))))

const paletteByType = {
  Rocky: ['#9db4c5', '#536b86', '#263c59'], Ocean: ['#91e1ea', '#278baa', '#17446c'],
  Desert: ['#f4c789', '#cf8a63', '#664768'], Ice: ['#d4f3ff', '#73b9dd', '#4267a0'],
  'Gas Giant': ['#e2c1ff', '#9170d2', '#35386f'], Volcanic: ['#ffc075', '#d65e53', '#612b50'],
  Toxic: ['#c9ed9a', '#62a77e', '#2e5363'], Anomalous: ['#f0c1ff', '#aa68cb', '#402c72'],
}

const catalogStart = source.indexOf('export const PLANETS:')
const catalogEnd = source.indexOf('\n]\n\nexport const CASE_COST', catalogStart)
if (catalogStart < 0 || catalogEnd < 0) throw new Error('Could not locate the PLANETS catalog in src/game/data.ts')
const planetLines = source.slice(catalogStart, catalogEnd).split(/\r?\n/).filter((line) => /^\s*\{ key: '/.test(line))
const planets = planetLines.map((line) => {
  const value = (key, pattern = "'([^']*)'") => line.match(new RegExp(`${key}: ${pattern}`))?.[1]
  const number = (key) => Number(value(key, '(-?[0-9.]+)'))
  const resources = [...(value('resources', '\\[([^\\]]*)\\]') || '').matchAll(/'([^']+)'/g)].map((match) => match[1])
  return {
    key: value('key'), name: value('name'), type: value('type'), rarity: value('rarity'),
    mass: number('mass'), temperature: number('temperature'), atmosphere: value('atmosphere'),
    resources, sector: value('sector'), bonus: value('bonus'),
  }
}).filter((planet) => planet.key && planet.name)

if (planets.length < 30) throw new Error(`Expected 30 planet templates, found ${planets.length}`)

for (const [index, planet] of planets.entries()) {
  const [light, mid, dark] = paletteByType[planet.type] || paletteByType.Rocky
  const hasRings = ['Gas Giant', 'Ice'].includes(planet.type) || index % 5 === 0
  const craters = Array.from({ length: 3 + index % 3 }, (_, crater) => {
    const x = 26 + ((index * 17 + crater * 29) % 52)
    const y = 27 + ((index * 11 + crater * 21) % 48)
    const radius = 3 + ((index + crater) % 4)
    return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${dark}" opacity=".34"/><path d="M${x - radius} ${y}a${radius} ${radius} 0 0 1 ${radius} -${radius}" fill="none" stroke="${light}" stroke-width="1.5" opacity=".38"/>`
  }).join('')
  const continents = planet.type === 'Ocean' || planet.type === 'Toxic'
    ? `<path d="M24 42q12-12 20-4t-3 13q-11 10-17 3t0-12M55 62q7-11 17-4t-2 13q-10 7-15-1" fill="${light}" opacity=".48"/>`
    : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 100 100"><defs><radialGradient id="p" cx="30%" cy="25%"><stop stop-color="${light}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></radialGradient><clipPath id="c"><circle cx="50" cy="50" r="31"/></clipPath><filter id="g"><feGaussianBlur stdDeviation="4"/></filter></defs><rect width="100" height="100" rx="18" fill="#09172a"/><circle cx="50" cy="52" r="38" fill="${mid}" opacity=".2" filter="url(#g)"/>${hasRings ? `<ellipse cx="50" cy="52" rx="43" ry="13" fill="none" stroke="${light}" stroke-width="3" opacity=".76" transform="rotate(-22 50 52)"/>` : ''}<circle cx="50" cy="50" r="31" fill="url(#p)" stroke="#d8edff" stroke-opacity=".58" stroke-width="1.5"/><g clip-path="url(#c)">${continents}${craters}<path d="M20 24q22-18 49-3" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="4"/></g>${hasRings ? `<ellipse cx="50" cy="52" rx="43" ry="13" fill="none" stroke="${light}" stroke-width="2" opacity=".75" transform="rotate(-22 50 52)"/>` : ''}<circle cx="71" cy="22" r="2" fill="#fff"/><path d="M20 79h60" stroke="${light}" stroke-opacity=".45"/></svg>`
  const imagePath = `${publicUrl}/nft/planets/${planet.key}.svg`
  const metadata = {
    name: `FeNi · ${planet.name}`,
    description: `${planet.rarity} ${planet.type} planet discovered in the FeNi cosmic collection. ${planet.bonus}`,
    image: imagePath,
    external_url: publicUrl,
    attributes: [
      { trait_type: 'Rarity', value: planet.rarity }, { trait_type: 'Type', value: planet.type },
      { trait_type: 'Mass', value: `${planet.mass} Earth` }, { trait_type: 'Temperature', value: `${planet.temperature} K` },
      { trait_type: 'Atmosphere', value: planet.atmosphere }, { trait_type: 'Sector', value: planet.sector },
      { trait_type: 'Resources', value: planet.resources.join(', ') }, { trait_type: 'Bonus', value: planet.bonus },
    ],
    properties: { category: 'image', files: [{ uri: imagePath, type: 'image/svg+xml' }] },
  }
  await Promise.all([
    writeFile(resolve(output, `${planet.key}.json`), `${JSON.stringify(metadata, null, 2)}\n`),
    writeFile(resolve(output, `${planet.key}.svg`), `${svg}\n`),
  ])
}

console.log(`Generated NFT metadata and artwork for ${planets.length} planet templates.`)
