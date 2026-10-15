function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function sha256(text: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))
}

/** Hash de senha simulado (SHA-256 + salt). Nunca guardamos a senha em texto puro. */
export function hashPassword(password: string, salt: string): Promise<string> {
  return sha256(`${salt}:${password}`)
}

export async function verifyPassword(
  password: string,
  rec: { passwordHash: string; salt: string },
): Promise<boolean> {
  return (await hashPassword(password, rec.salt)) === rec.passwordHash
}
