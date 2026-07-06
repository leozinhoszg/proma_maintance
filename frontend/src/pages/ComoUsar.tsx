import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

/** Manual de uso — escrito para o operador e para a equipe de manutenção. */
export function ComoUsar() {
  return (
    <div className="manual">
      <motion.div
        className="page-head"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <p className="eyebrow">Manual · Guia rápido</p>
        <h1>Como usar</h1>
        <p className="sub">
          Tudo o que você precisa para abrir um chamado e acompanhar o atendimento.
          Leitura de 3 minutos.
        </p>
      </motion.div>

      <section className="manual-sec">
        <h2>O que é este sistema</h2>
        <p>
          Aqui o operador registra problemas de máquina e a equipe de manutenção
          recebe o chamado <b>na hora</b>, sem rádio, papel ou telefone. Tudo o que
          acontece aparece no painel em tempo real.
        </p>
      </section>

      <section className="manual-sec">
        <h2>Acesso e perfis</h2>
        <p>
          O acesso é feito com <b>e-mail e senha</b>. As contas são criadas pelo
          administrador — você recebe um e-mail de convite para definir sua senha.
          Esqueceu a senha? Use <b>“Esqueci minha senha”</b> na tela de login.
        </p>
        <ul className="lista-simples">
          <li><b>Solicitante</b> — abre chamados e acompanha o painel.</li>
          <li><b>Atendente</b> — tudo do solicitante + assume e conclui chamados.</li>
          <li><b>Admin</b> — tudo + gerencia usuários, perfis e configurações.</li>
        </ul>
      </section>

      <section className="manual-sec">
        <h2>Abrir um chamado (operador)</h2>
        <ol className="passos">
          <li>
            <b>Identifique a máquina e o setor</b> — use o nome ou código da placa
            da máquina (ex.: <span className="mono">Prensa Hidráulica 3</span>, setor{' '}
            <span className="mono">Estamparia</span>).
          </li>
          <li>
            <b>Escolha o tipo de problema</b> — elétrico, mecânico, hidráulico,
            software ou outro. Na dúvida, escolha o mais próximo.
          </li>
          <li>
            <b>Defina a prioridade</b> — seja honesto: urgente é só quando há risco
            ou perda de produção. Priorizar tudo é o mesmo que não priorizar nada.
          </li>
          <li>
            <b>Descreva o que está acontecendo</b> — o que você viu, ouviu ou sentiu
            (ruído, vazamento, erro na tela). Quanto mais claro, mais rápido o reparo.
          </li>
          <li>
            <b>Máquina parada?</b> — ligue a chave <b>06</b> se a produção está
            interrompida. Isso coloca o chamado no topo da fila.
          </li>
        </ol>
        <p>
          Ao enviar, você recebe o número da ordem de serviço (ex.:{' '}
          <span className="mono">OS-012</span>). Guarde-o para acompanhar.
        </p>
      </section>

      <section className="manual-sec">
        <h2>A regra da fila</h2>
        <p>A ordem de atendimento é sempre a mesma, nesta sequência:</p>
        <div className="regra">
          <div className="regra-nivel">
            <span className="regra-num">1</span>
            <b>Máquina parada</b>
            <small>produção interrompida vai para o topo</small>
          </div>
          <span className="regra-seta" aria-hidden="true">→</span>
          <div className="regra-nivel">
            <span className="regra-num">2</span>
            <b>Prioridade</b>
            <small>urgente · alta · média · baixa</small>
          </div>
          <span className="regra-seta" aria-hidden="true">→</span>
          <div className="regra-nivel">
            <span className="regra-num">3</span>
            <b>Ordem de chegada</b>
            <small>em empate, quem abriu primeiro</small>
          </div>
        </div>
        <p>
          No painel, cada chamado da fila mostra sua <b>posição</b> (1º, 2º, …) e há
          quanto tempo aguarda. A posição pode mudar se chegar um chamado mais crítico.
        </p>
      </section>

      <section className="manual-sec">
        <h2>Acompanhar no painel (manutenção)</h2>
        <p>
          O <Link to="/painel">painel</Link> tem três abas para a tela não ficar poluída:
        </p>
        <ul className="lista-simples">
          <li><b>Na fila</b> — chamados aguardando, já na ordem de atendimento.</li>
          <li><b>Em atendimento</b> — o que a equipe está resolvendo agora.</li>
          <li><b>Concluídos</b> — histórico, do mais recente para o mais antigo.</li>
        </ul>
        <p>
          O selo <b>“Ao vivo”</b> verde no topo indica que o painel está conectado e
          atualiza sozinho — não precisa recarregar a página.
        </p>
      </section>

      <section className="manual-sec">
        <h2>Cores e status</h2>
        <div className="legenda">
          <div className="legenda-row">
            <span className="cor-dot" style={{ background: 'var(--red)' }} />
            <b>Aberto</b>
            <span>aguardando atendimento — use <b>Assumir</b> para começar</span>
          </div>
          <div className="legenda-row">
            <span className="cor-dot" style={{ background: 'var(--amber)' }} />
            <b>Em atendimento</b>
            <span>alguém já está cuidando — use <b>Concluir</b> ao terminar</span>
          </div>
          <div className="legenda-row">
            <span className="cor-dot" style={{ background: 'var(--green)' }} />
            <b>Concluído</b>
            <span>reparo finalizado, chamado vai para o histórico</span>
          </div>
        </div>
        <p>
          A faixa listrada amarela e preta em um chamado significa{' '}
          <b>máquina parada</b>. O contador “Urgentes” pisca quando há chamado
          urgente sem conclusão.
        </p>
      </section>

      <section className="manual-sec">
        <h2>Dúvidas comuns</h2>
        <dl className="faq">
          <dt>Abri um chamado urgente e ele não está em 1º. Por quê?</dt>
          <dd>
            Existe chamado com <b>máquina parada</b> na frente — parada vem antes de
            prioridade. Se a sua máquina também parou, o correto é abrir o chamado
            marcando a chave 07.
          </dd>
          <dt>Assumi um chamado sem querer. E agora?</dt>
          <dd>
            Conclua-o apenas quando o reparo terminar. Se não for você quem vai
            atender, avise a equipe — o fluxo não permite “devolver” para a fila.
          </dd>
          <dt>O selo “Ao vivo” está cinza.</dt>
          <dd>
            O painel perdeu a conexão e está tentando reconectar sozinho. Verifique a
            rede se persistir por mais de um minuto.
          </dd>
        </dl>
      </section>

      <div className="manual-cta">
        <Link to="/" className="botao-link">Abrir um chamado agora</Link>
      </div>
    </div>
  )
}
