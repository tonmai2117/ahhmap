/** Geographic wall placement. Lengths are metres, never screen pixels. */
export type LngLatPair = [number, number]
export type ImagePoint = [number, number]
export type FacadePlacement = {
  wallStart: LngLatPair
  wallEnd: LngLatPair
  outwardBearing: number
  along: number
  width: number
  height: number
  bottom: number
  cameraDistance: number
  /** Source-photo corners: top-left, top-right, bottom-right, bottom-left; normalized. */
  crop?: [ImagePoint, ImagePoint, ImagePoint, ImagePoint]
}

const METRES_PER_DEGREE = 111319.49079327358
export function offsetLngLat(origin: LngLatPair, east: number, north: number): LngLatPair {
  return [origin[0] + east / (METRES_PER_DEGREE * Math.cos(origin[1] * Math.PI / 180)), origin[1] + north / METRES_PER_DEGREE]
}

export function wallLayout(placement: FacadePlacement) {
  const { wallStart: a, wallEnd: b } = placement
  const east = (b[0] - a[0]) * METRES_PER_DEGREE * Math.cos(a[1] * Math.PI / 180)
  const north = (b[1] - a[1]) * METRES_PER_DEGREE
  const length = Math.hypot(east, north)
  if (!Number.isFinite(length) || length < 0.5) throw new Error('กำหนดปลายผนังสองจุดให้ห่างกันอย่างน้อย 0.5 เมตร')
  const width = Math.max(0.25, Math.min(placement.width, length - 0.1))
  const height = Math.max(0.25, placement.height)
  const along = Math.max(width / 2 + 0.04, Math.min(placement.along * length, length - width / 2 - 0.04))
  const angle = placement.outwardBearing * Math.PI / 180
  const normal: [number, number] = [Math.sin(angle), Math.cos(angle)]
  // A five-centimetre separation prevents flicker against the building surface.
  const center = offsetLngLat(a, east / length * along + normal[0] * 0.05, north / length * along + normal[1] * 0.05)
  return { center, width, height, normal, tangent: [east / length, north / length] as [number, number], bottom: Math.max(0, placement.bottom), length }
}

/** Perspective mapping from a rectangular wall to four corners in the original photograph. */
export function photoUV(crop: FacadePlacement['crop'], u: number, v: number): [number, number] {
  if (!crop) return [u, v]
  const [p0, p1, p2, p3] = crop
  const dx1 = p1[0] - p2[0], dx2 = p3[0] - p2[0], dx3 = p0[0] - p1[0] + p2[0] - p3[0]
  const dy1 = p1[1] - p2[1], dy2 = p3[1] - p2[1], dy3 = p0[1] - p1[1] + p2[1] - p3[1]
  const det = dx1 * dy2 - dx2 * dy1
  const g = Math.abs(det) < 1e-9 ? 0 : (dx3 * dy2 - dx2 * dy3) / det
  const h = Math.abs(det) < 1e-9 ? 0 : (dx1 * dy3 - dx3 * dy1) / det
  // Homography coordinates use the same top-to-bottom v as the source photo;
  // convert to Three's bottom-origin texture v only in the returned coordinate.
  const t = v
  const divisor = g * u + h * t + 1
  const x = ((p1[0] - p0[0] + g * p1[0]) * u + (p3[0] - p0[0] + h * p3[0]) * t + p0[0]) / divisor
  const y = ((p1[1] - p0[1] + g * p1[1]) * u + (p3[1] - p0[1] + h * p3[1]) * t + p0[1]) / divisor
  return [x, 1 - y]
}

export function validFacade(facade: FacadePlacement) {
  const cropValid = !facade.crop || (facade.crop.length === 4 && facade.crop.every((point) => point.length === 2 && point.every(Number.isFinite) && point[0] >= 0 && point[0] <= 1 && point[1] >= 0 && point[1] <= 1))
  return cropValid && [...facade.wallStart, ...facade.wallEnd, facade.outwardBearing, facade.along, facade.width, facade.height, facade.bottom, facade.cameraDistance].every(Number.isFinite)
    && facade.width > 0 && facade.height > 0 && facade.bottom >= 0 && facade.cameraDistance >= 3
    && facade.wallStart[0] >= -180 && facade.wallStart[0] <= 180 && Math.abs(facade.wallStart[1]) < 85
    && facade.wallEnd[0] >= -180 && facade.wallEnd[0] <= 180 && Math.abs(facade.wallEnd[1]) < 85
    && Math.hypot(facade.wallStart[0] - facade.wallEnd[0], facade.wallStart[1] - facade.wallEnd[1]) > 0.000005
}
