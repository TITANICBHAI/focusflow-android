export async function sha256hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function hashPin(pin: string): Promise<string> {
  return sha256hex(`focusflow-session-pin:${pin}`)
}

export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const h = await hashPin(pin)
  return h === storedHash
}
