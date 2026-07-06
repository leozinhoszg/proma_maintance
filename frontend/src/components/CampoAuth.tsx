import { useState, type InputHTMLAttributes } from 'react'

type Icone = 'email' | 'senha'

const ICONES: Record<Icone, JSX.Element> = {
  email: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  ),
  senha: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="15" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ),
}

const OLHO_ABERTO = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
    <circle cx="12" cy="12" r="2.6" />
  </svg>
)
const OLHO_FECHADO = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M2 12s3.5-6 10-6c1.8 0 3.4.45 4.8 1.1M22 12s-3.5 6-10 6c-1.8 0-3.4-.45-4.8-1.1" />
    <path d="m4 20 16-16" />
  </svg>
)

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  numero: string
  rotulo: string
  icone: Icone
}

/**
 * Campo das telas de acesso: ícone, rótulo numerado (formulário de OS),
 * acento âmbar animado no foco, mostrar/ocultar senha e aviso de Caps Lock.
 */
export function CampoAuth({ numero, rotulo, icone, ...input }: Props) {
  const ehSenha = input.type === 'password'
  const [visivel, setVisivel] = useState(false)
  const [capsLock, setCapsLock] = useState(false)

  return (
    <label className="campo-auth">
      <span className="campo-rotulo">
        <b>{numero}</b>
        {rotulo}
        {ehSenha && capsLock && <em className="campo-caps">Caps Lock ligado</em>}
      </span>
      <span className="campo-caixa">
        {ICONES[icone]}
        <input
          {...input}
          type={ehSenha && visivel ? 'text' : input.type}
          onKeyUp={(e) => {
            if (ehSenha) setCapsLock(e.getModifierState('CapsLock'))
            input.onKeyUp?.(e)
          }}
        />
        {ehSenha && (
          <button
            type="button"
            className="campo-olho"
            onClick={() => setVisivel((v) => !v)}
            aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
            tabIndex={-1}
          >
            {visivel ? OLHO_FECHADO : OLHO_ABERTO}
          </button>
        )}
      </span>
    </label>
  )
}
