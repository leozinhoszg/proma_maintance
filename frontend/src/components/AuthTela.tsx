import { Suspense, lazy, type ReactNode } from 'react'
import { motion } from 'framer-motion'

const GearCanvas = lazy(() =>
  import('./GearCanvas').then((m) => ({ default: m.GearCanvas })),
)

/**
 * Moldura das telas de acesso (login, esqueci, redefinir):
 * fundo com engrenagens WebGL, cartão central e entrada orquestrada.
 */
export function AuthTela({ children }: { children: ReactNode }) {
  return (
    <div className="auth-tela">
      <div className="auth-fundo" aria-hidden="true">
        <Suspense fallback={null}>
          <GearCanvas />
        </Suspense>
        <div className="auth-veu" />
      </div>

      <motion.header
        className="auth-brand"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <strong>PROMA</strong>
        <span>MAINTANCE</span>
      </motion.header>

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
      >
        <div className="auth-hazard" aria-hidden="true" />
        {children}
      </motion.div>

      <motion.footer
        className="auth-rodape"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        sistema de chamados de manutenção · acesso restrito
      </motion.footer>
    </div>
  )
}
