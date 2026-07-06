import bcrypt from 'bcryptjs'

const CUSTO = 12

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, CUSTO)
}

/** Aceita hash nulo (usuário que ainda não definiu senha) — nunca autentica. */
export async function verificarSenha(senha: string, hash: string | null): Promise<boolean> {
  if (!hash) {
    // custo constante mesmo sem hash, para não vazar existência por timing
    await bcrypt.compare(senha, '$2b$12$invalidoinvalidoinvalidoinvalidoinvalidoinvalidoinva')
    return false
  }
  return bcrypt.compare(senha, hash)
}
