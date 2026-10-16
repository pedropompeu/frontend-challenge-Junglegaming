export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export const AVATAR_ACCEPT = AVATAR_TYPES.join(',')
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024
export const AVATAR_SIZE = 256
/** Limite do contrato (`AvatarBodySchema`). */
export const AVATAR_MAX_CHARS = 300_000

export class AvatarImageError extends Error {}

/** Confere o arquivo escolhido antes de abrir a imagem. */
export function avatarFileError(file: { type: string; size: number }): string | null {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) {
    return 'Use uma imagem PNG, JPEG ou WebP'
  }
  if (file.size > AVATAR_MAX_BYTES) return 'A imagem deve ter até 5 MB'
  return null
}

/**
 * Recorta o centro em quadrado, reduz para 256 px e codifica em WebP. Onde o canvas não gera
 * WebP (Safari), usa JPEG, que o contrato também aceita.
 */
export async function resizeAvatar(file: Blob): Promise<string> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new AvatarImageError('Não foi possível ler a imagem')
  }
  try {
    const canvas = document.createElement('canvas')
    canvas.width = AVATAR_SIZE
    canvas.height = AVATAR_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new AvatarImageError('Não foi possível processar a imagem')
    const side = Math.min(bitmap.width, bitmap.height)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      AVATAR_SIZE,
      AVATAR_SIZE,
    )
    for (const quality of [0.9, 0.75, 0.6]) {
      let url = canvas.toDataURL('image/webp', quality)
      if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', quality)
      if (url.length <= AVATAR_MAX_CHARS) return url
    }
    throw new AvatarImageError('Imagem grande demais')
  } finally {
    bitmap.close()
  }
}
