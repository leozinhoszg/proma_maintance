import { createHash, randomBytes } from 'node:crypto'

/** Token opaco de 32 bytes; só o hash sha-256 vai para o banco. */
export function gerarToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex')
  return { token, hash: hashToken(token) }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
