import mapData from './data/map.json'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

// Preserve the Map response contract without inventing players or portal data.
async function request<T>(path: string): Promise<T> {
  const url = new URL(path, 'https://aahhmap.local')
  if (url.pathname === '/me') {
    return { coin_balance: mapData.coin_balance } as T
  }
  if (url.pathname === '/treasures') {
    return { treasures: mapData.treasures } as T
  }
  throw new ApiError(503, 'บริการนี้ยังไม่ได้เชื่อมต่อกับแอปแผนที่')
}

async function unavailable<T>(): Promise<T> {
  throw new ApiError(503, 'ยังไม่ได้เชื่อมต่อระบบเกมและรับรางวัล')
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(_path: string, _body?: unknown) => unavailable<T>(),
  delete: <T>(_path: string) => unavailable<T>(),
}