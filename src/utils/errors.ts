import { ApiError } from '../api'

export function userFacingError(err: unknown, fallback = 'เกิดข้อผิดพลาด กรุณาลองใหม่'): string {
  if (!(err instanceof ApiError)) return fallback

  if (err.message === 'line_friend_required') {
    return 'กรุณาเพิ่ม LINE Official Account เป็นเพื่อนก่อนใช้งาน'
  }
  if (err.status === 400) return 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบแล้วลองใหม่'
  if (err.status === 401) return 'เซสชันหมดอายุ กรุณาเปิดผ่าน LINE แล้วลองใหม่'
  if (err.status === 403) return 'ไม่มีสิทธิ์ทำรายการนี้'
  if (err.status === 404) return 'ไม่พบข้อมูลที่ต้องการ กรุณาโหลดใหม่'
  if (err.status === 409) return 'สถานะข้อมูลเปลี่ยนไป กรุณาโหลดใหม่แล้วลองอีกครั้ง'
  if (err.status === 429) return 'ทำรายการถี่เกินไป กรุณารอสักครู่แล้วลองใหม่'
  if (err.status >= 500) return 'ระบบยังไม่พร้อมให้บริการ กรุณาลองใหม่อีกครั้ง'

  return fallback
}
