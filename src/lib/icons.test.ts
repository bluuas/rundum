import { describe, expect, it } from 'vitest'
import { ICON_PATHS, type IconName } from './icons'
import { SPORTS } from './sports'

describe('the inlined icon set', () => {
  it('is filled paths on one grid, so a single viewBox renders all of them', () => {
    // `Icon` hard-codes viewBox="0 0 256 256" and fill="currentColor". A glyph
    // copied in at another size, or a stroked one, would silently render as a
    // blob or as nothing at all.
    for (const [name, path] of Object.entries(ICON_PATHS)) {
      expect(path.startsWith('<path'), `${name} is not a path`).toBe(true)
      expect(path, `${name} is stroked, not filled`).not.toContain('stroke')
    }
  })

  it('gives every sport its own icon', () => {
    /*
     * The reason Phosphor was chosen over Lucide, kept as a test. Lucide has
     * no running figure and no racquet sport, so running and walking would
     * both have been footprints and tennis and padel both a dot — two pairs
     * sharing a mark, in a feed whose job is telling sports apart.
     */
    const used = SPORTS.map((sport) => sport.icon)
    expect(new Set(used).size).toBe(SPORTS.length)
  })

  it('has no icon it does not draw', () => {
    // Copied paths are dead weight once nothing references them, and unlike a
    // dependency nothing prunes them.
    const referenced = new Set<IconName>([
      ...SPORTS.map((sport) => sport.icon),
      'compass',
      'plus-circle',
      'list-checks',
      'user-circle',
      'map-trifold',
      'bell',
      'mountains',
      'warning',
      'link-simple',
      'circle',
    ])

    expect(
      [...Object.keys(ICON_PATHS)].filter((n) => !referenced.has(n as IconName)),
    ).toEqual([])
  })
})
