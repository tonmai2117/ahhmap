import { describe, expect, it } from 'vitest'
import { photoUV, validFacade, wallLayout, type FacadePlacement } from '../artMap/facadeGeometry'

const placement: FacadePlacement = { wallStart: [100.5089, 13.7371], wallEnd: [100.509, 13.7372], outwardBearing: 45, along: .5, width: 4, height: 5, bottom: .5, cameraDistance: 10, crop: [[0, 0], [1, 0], [1, 1], [0, 1]] }
describe('facade geometry', () => {
  it('keeps a facade finite and centered on the wall edge', () => {
    const wall = wallLayout(placement)
    expect(validFacade(placement)).toBe(true)
    expect(wall.width).toBeLessThan(wall.length)
    expect(wall.height).toBe(5)
    expect(wall.bottom).toBe(.5)
  })
  it('maps the four cropped photo corners to texture corners', () => {
    expect(photoUV(placement.crop, 0, 0)).toEqual([0, 0])
    expect(photoUV(placement.crop, 1, 0)).toEqual([1, 0])
    expect(photoUV(placement.crop, 1, 1)).toEqual([1, 1])
    expect(photoUV(placement.crop, 0, 1)).toEqual([0, 1])
  })
  it('rejects malformed crop coordinates', () => {
    expect(validFacade({ ...placement, crop: [[0, 0], [2, 0], [1, 1], [0, 1]] })).toBe(false)
  })
})
