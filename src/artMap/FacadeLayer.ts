import { MercatorCoordinate, type CustomLayerInterface, type CustomRenderMethodInput, type Map as MapLibreMap } from 'maplibre-gl'
import { BufferGeometry, Float32BufferAttribute, Mesh, MeshBasicMaterial, Scene, Camera, Matrix4, TextureLoader, WebGLRenderer, SRGBColorSpace, DoubleSide, type Texture } from 'three'
import { type Artwork } from './artData'
import { photoUV, wallLayout } from './facadeGeometry'

/** Real, depth-tested vertical meshes sharing MapLibre's camera and depth buffer. */
export class FacadeLayer implements CustomLayerInterface {
  id = 'artwork-facades-3d'
  type = 'custom' as const
  renderingMode = '3d' as const
  private map?: MapLibreMap
  private renderer?: WebGLRenderer
  private scene = new Scene()
  private camera = new Camera()
  private origin = MercatorCoordinate.fromLngLat([100.509, 13.7372])
  private model = new Matrix4()
  private revision = 0
  private activeTextures = new Set<Texture>()

  constructor(private artworks: Artwork[], private onError?: (message: string) => void) {
    const scale = this.origin.meterInMercatorCoordinateUnits()
    this.model.makeTranslation(this.origin.x, this.origin.y, 0).multiply(new Matrix4().makeScale(scale, scale, scale))
  }

  onAdd(map: MapLibreMap, gl: WebGLRenderingContext | WebGL2RenderingContext) {
    this.map = map
    this.renderer = new WebGLRenderer({ canvas: map.getCanvas(), context: gl as WebGL2RenderingContext, antialias: true })
    this.renderer.autoClear = false
    this.renderer.outputColorSpace = SRGBColorSpace
    this.setArtworks(this.artworks)
  }

  private clear() {
    for (const object of [...this.scene.children]) {
      const mesh = object as Mesh<BufferGeometry, MeshBasicMaterial>
      mesh.geometry.dispose()
      mesh.material.dispose()
      this.scene.remove(mesh)
    }
    this.activeTextures.forEach((texture) => texture.dispose())
    this.activeTextures.clear()
  }

  setArtworks(artworks: Artwork[]) {
    this.artworks = artworks
    const revision = ++this.revision
    this.clear()
    if (!this.renderer) return
    const scale = this.origin.meterInMercatorCoordinateUnits()
    for (const artwork of artworks) {
      if (!artwork.facade) continue
      const placement = artwork.facade
      const wall = wallLayout(placement)
      const center = MercatorCoordinate.fromLngLat(wall.center)
      const positions: number[] = [], uvs: number[] = [], indices: number[] = []
      // Subdivision keeps the projectively cropped photograph accurate over both triangles.
      const steps = 24
      for (let y = 0; y <= steps; y++) for (let x = 0; x <= steps; x++) {
        const u = x / steps, v = y / steps, along = (u - 0.5) * wall.width
        positions.push((center.x - this.origin.x) / scale + wall.tangent[0] * along, (center.y - this.origin.y) / scale - wall.tangent[1] * along, wall.bottom + v * wall.height)
        const facesForward = wall.tangent[0] * -wall.normal[1] + wall.tangent[1] * wall.normal[0] > 0
        uvs.push(...photoUV(placement.crop, facesForward ? u : 1 - u, v))
      }
      for (let y = 0; y < steps; y++) for (let x = 0; x < steps; x++) {
        const a = y * (steps + 1) + x, b = a + 1, c = a + steps + 1, d = c + 1
        indices.push(a, b, d, a, d, c)
      }
      const geometry = new BufferGeometry()
      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
      geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
      geometry.setIndex(indices)
      const material = new MeshBasicMaterial({ side: DoubleSide, depthTest: true, depthWrite: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
      const mesh = new Mesh(geometry, material)
      mesh.frustumCulled = false
      mesh.visible = false
      this.scene.add(mesh)
      new TextureLoader().load(artwork.wallImageUrl || artwork.imageUrl, (texture) => {
        if (this.revision !== revision) { texture.dispose(); return }
        texture.colorSpace = SRGBColorSpace
        texture.anisotropy = Math.min(this.renderer?.capabilities.getMaxAnisotropy() ?? 1, 8)
        material.map = texture
        material.needsUpdate = true
        mesh.visible = true
        this.activeTextures.add(texture)
        this.map?.triggerRepaint()
      }, undefined, () => {
        if (this.revision === revision) this.onError?.(`โหลดภาพบนผนัง “${artwork.title}” ไม่สำเร็จ`)
      })
    }
    this.map?.triggerRepaint()
  }

  render(_gl: WebGLRenderingContext | WebGL2RenderingContext, args: CustomRenderMethodInput) {
    if (!this.renderer) return
    this.camera.projectionMatrix.fromArray(args.defaultProjectionData.mainMatrix).multiply(this.model)
    this.renderer.resetState()
    // Do not clear: buildings already in the shared depth buffer must occlude the murals.
    this.renderer.render(this.scene, this.camera)
    this.renderer.resetState()
  }

  onRemove() {
    ++this.revision
    this.clear()
    this.renderer?.dispose()
    this.renderer = undefined
    this.map = undefined
  }
}
