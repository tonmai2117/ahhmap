export type ArtStatus = 'draft' | 'published'

export type Artwork = {
  id: string
  title: string
  artist: string
  year: string
  medium: string
  description: string
  venue: string
  address: string
  lat: number
  lng: number
  imageUrl: string
  /** Optional image and placement used to render the artwork on the building facade. */
  wallImageUrl?: string
  wallWidth?: number
  wallHeight?: number
  wallRotation?: number
  wallOffsetX?: number
  wallOffsetY?: number
  /** Camera position used after selecting this artwork. */
  cameraLat?: number
  cameraLng?: number
  cameraZoom?: number
  cameraPitch?: number
  cameraBearing?: number
  accent: string
  status: ArtStatus
}

export const SEED_ARTWORKS: Artwork[] = [
  {
    id: 'songwat-elephant',
    title: 'ช้างแห่งทรงวาด',
    artist: 'Song Wat Street Art',
    year: '2024',
    medium: 'จิตรกรรมฝาผนัง',
    description: 'ภาพจิตรกรรมฝาผนังรูปช้างบนอาคารย่านถนนทรงวาด งานศิลป์ที่เชื่อมเรื่องเล่าของย่านการค้าเก่ากับผู้คนที่เดินผ่าน',
    venue: 'Song Wat Street Art',
    address: '1073 Song Wat Rd, Bangkok',
    lat: 13.737148,
    lng: 100.509079,
    imageUrl: '/artworks/songwat-elephant-mural.jpg',
    wallImageUrl: '/artworks/songwat-elephant-mural.jpg',
    wallWidth: 210,
    wallHeight: 330,
    wallRotation: 8,
    wallOffsetX: 0,
    wallOffsetY: -72,
    cameraLat: 13.73705,
    cameraLng: 100.50884,
    cameraZoom: 18.05,
    cameraPitch: 58,
    cameraBearing: 18,
    accent: '#c48b57',
    status: 'published',
  },
  {
    id: 'songwat-woman',
    title: 'หญิงสาวกับดอกบัวและผีเสื้อ',
    artist: 'Belgium in Thailand 2024',
    year: '2024',
    medium: 'จิตรกรรมฝาผนัง',
    description: 'ภาพหญิงสาวถือพัด รายล้อมด้วยดอกไม้และผีเสื้อบนผนังอาคารย่านทรงวาด',
    venue: 'Song Wat Street Art',
    address: '1390–1392 Samphanthawong, Bangkok 10100',
    lat: 13.737375,
    lng: 100.508739,
    imageUrl: '/artworks/songwat-woman-mural.jpg',
    wallImageUrl: '/artworks/songwat-woman-mural.jpg',
    wallWidth: 205,
    wallHeight: 345,
    wallRotation: -6,
    wallOffsetX: 0,
    wallOffsetY: -78,
    cameraLat: 13.73729,
    cameraLng: 100.50861,
    cameraZoom: 18.05,
    cameraPitch: 58,
    cameraBearing: -20,
    accent: '#e48587',
    status: 'published',
  },
  {
    id: 'bkk-01',
    title: 'แสงที่เดินทางผ่านเมือง',
    artist: 'Studio Chao Phraya',
    year: '2025',
    medium: 'ภาพถ่ายดิจิทัล',
    description: 'บันทึกจังหวะแสงยามเย็นที่สะท้อนบนผิวน้ำและผนังเมืองเก่า',
    venue: 'ท่ามหาราช',
    address: 'ถนนมหาราช เขตพระนคร กรุงเทพฯ',
    lat: 13.7466,
    lng: 100.4917,
    imageUrl: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=900&q=85',
    accent: '#f1b35b',
    status: 'published',
  },
  {
    id: 'bkk-02',
    title: 'กรุงเทพฯ ในชั้นความทรงจำ',
    artist: 'Pimchanok K.',
    year: '2024',
    medium: 'สื่อผสม',
    description: 'ชิ้นงานที่ประกอบเมือง เสียง และความทรงจำของผู้คนที่เดินผ่าน',
    venue: 'เจริญกรุง 32',
    address: 'ซอยเจริญกรุง 32 เขตบางรัก กรุงเทพฯ',
    lat: 13.7245,
    lng: 100.5132,
    imageUrl: 'https://images.unsplash.com/photo-1577083288073-40892c0860a4?auto=format&fit=crop&w=900&q=85',
    accent: '#d87055',
    status: 'published',
  },
  {
    id: 'bkk-03',
    title: 'จังหวะของทางแยก',
    artist: 'Nattapol W.',
    year: '2023',
    medium: 'ภาพพิมพ์',
    description: 'เส้นสายของการเคลื่อนที่ ณ จุดตัดของผู้คน รถ และสถาปัตยกรรม',
    venue: 'สวนเบญจกิติ',
    address: 'ถนนรัชดาภิเษก เขตคลองเตย กรุงเทพฯ',
    lat: 13.7308,
    lng: 100.5557,
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=900&q=85',
    accent: '#9aa6c8',
    status: 'published',
  },
]

const STORAGE_KEY = 'linemap-artworks-v1'

function withArtworkDefaults(artwork: Artwork): Artwork {
  return {
    ...artwork,
    wallImageUrl: artwork.wallImageUrl || artwork.imageUrl,
    wallWidth: artwork.wallWidth ?? 190,
    wallHeight: artwork.wallHeight ?? 300,
    wallRotation: artwork.wallRotation ?? 0,
    wallOffsetX: artwork.wallOffsetX ?? 0,
    wallOffsetY: artwork.wallOffsetY ?? -60,
    cameraLat: artwork.cameraLat ?? artwork.lat,
    cameraLng: artwork.cameraLng ?? artwork.lng,
    cameraZoom: artwork.cameraZoom ?? 17.1,
    cameraPitch: artwork.cameraPitch ?? 56,
    cameraBearing: artwork.cameraBearing ?? 0,
  }
}

export function readArtworks(): Artwork[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return SEED_ARTWORKS
    const parsed = JSON.parse(raw) as Artwork[]
    return Array.isArray(parsed) && parsed.length ? parsed.map(withArtworkDefaults) : SEED_ARTWORKS
  } catch {
    return SEED_ARTWORKS
  }
}

export function writeArtworks(artworks: Artwork[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(artworks))
}

export function makeArtworkId() {
  return `art-${Date.now().toString(36)}`
}
