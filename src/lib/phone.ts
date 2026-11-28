// Phone numbers as people in Ghana actually type them: "024 123 4567",
// "+233 24 123 4567", "233241234567", "(024) 123-4567". Ghana numbers are stored
// as +233XXXXXXXXX; other international numbers are kept if they start with +.
// Returns null when the input can't be a phone number.
export function normalizePhone(raw: string): string | null {
  const s = raw.trim().replace(/[\s\-().]/g, '')
  if (/^0\d{9}$/.test(s)) return `+233${s.slice(1)}`
  if (/^\+?233\d{9}$/.test(s)) return `+233${s.slice(-9)}`
  if (/^\+?233/.test(s)) return null // Ghana code with the wrong number of digits
  if (/^[235]\d{8}$/.test(s)) return `+233${s}` // local number typed without the 0
  if (/^\+[1-9]\d{7,14}$/.test(s)) return s
  return null
}

export const PHONE_HINT = 'Use a Ghana number like 024 123 4567, or start with + for another country.'
