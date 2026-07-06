import { useState } from 'react'
import { motion } from 'framer-motion'
import { AdminUsuarios } from './admin/AdminUsuarios'
import { AdminPerfis } from './admin/AdminPerfis'
import { AdminConfiguracoes } from './admin/AdminConfiguracoes'

type Aba = 'usuarios' | 'perfis' | 'configuracoes'

export function Admin() {
  const [aba, setAba] = useState<Aba>('usuarios')

  return (
    <>
      <motion.div
        className="page-head"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <p className="eyebrow">Administração · Sistema</p>
        <h1>Administração</h1>
        <p className="sub">
          Usuários, perfis de acesso e configurações do sistema — tudo dinâmico,
          sem precisar reiniciar nada.
        </p>
      </motion.div>

      <div className="tabs" role="tablist" aria-label="Seções da administração">
        <button role="tab" aria-selected={aba === 'usuarios'} className={aba === 'usuarios' ? 'ativo' : ''} onClick={() => setAba('usuarios')}>
          Usuários
        </button>
        <button role="tab" aria-selected={aba === 'perfis'} className={aba === 'perfis' ? 'ativo' : ''} onClick={() => setAba('perfis')}>
          Perfis
        </button>
        <button role="tab" aria-selected={aba === 'configuracoes'} className={aba === 'configuracoes' ? 'ativo' : ''} onClick={() => setAba('configuracoes')}>
          Configurações
        </button>
      </div>

      {aba === 'usuarios' && <AdminUsuarios />}
      {aba === 'perfis' && <AdminPerfis />}
      {aba === 'configuracoes' && <AdminConfiguracoes />}
    </>
  )
}
