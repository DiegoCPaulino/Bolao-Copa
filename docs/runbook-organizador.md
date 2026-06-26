# Runbook do Organizador — Bolão Copa 2026 (Entrega 1, terminal)

> Receita de operação do sistema durante o torneio. Siga na ordem; cada seção é
> uma tarefa fechada. Esta é a **Entrega 1**: tudo roda **localmente, no seu PC**,
> pela linha de comando, com o banco no Docker. Não há login (uso único, na sua
> máquina) nem internet — a comunicação com o grupo é você **copiando os textos
> gerados** e colando no WhatsApp.

---

## 0. Antes de tudo: ligar o sistema (toda sessão)

São dois passos, sempre nesta ordem. O sistema conversa com o Postgres no Docker —
sem o banco no ar, ele avisa e fecha.

1. **Suba o banco** (da raiz do projeto):
   ```
   docker compose up -d
   ```
   Confirme com `docker compose ps` — o serviço deve aparecer "Up" na porta 5432.
   (Antes disso, o Docker Desktop precisa estar aberto, com a baleia em
   "Engine running".)

2. **Abra o menu** (de dentro de `backend/`):
   ```
   cd backend
   npm run cli
   ```

Se aparecer "⚠️ Não consegui falar com o banco… rode docker compose up -d", você
pulou o passo 1: suba o banco e rode `npm run cli` de novo.

**Ao terminar a sessão:** escolha **Sair** no menu (encerra limpo). O banco pode
ficar de pé ou ser desligado com `docker compose down` — em ambos os casos os
dados **persistem** no volume; você não perde nada ao desligar.

---

## 1. Antes dos jogos: montar o bolão

### 1.1 Cadastrar participantes (e indicações)

Menu **Participantes → Cadastrar**.
- Digite o **nome**. O **apelido** é opcional (Enter pula) — use só pra distinguir
  xarás (dois "João").
- Em **"indicado por"**, o sistema **lista os já cadastrados** pra você escolher —
  nunca se digita o nome. Escolha **"Nenhum"** se ninguém indicou.
- O **primeiro** participante não tem quem o indique (a pergunta é pulada). Cadastre
  primeiro quem entrou sem indicação; depois os indicados podem apontar pra eles.

Editar/remover: **Participantes → Editar / Remover**. Remover **pede confirmação**.
Importante: remover um indicador **não apaga** os indicados — eles só perdem o
vínculo (e o desconto recalcula sozinho).

### 1.2 Conferir pagamentos e mandar a cobrança

Menu **Pagamentos**.
- **Listar** mostra cada um com o **valor a pagar** (já com o desconto de indicação)
  e os três **totais**: esperado, recebido, falta. Você não digita valor — ele é
  calculado: R$40 base, −R$5 por indicado direto que entrou, piso de R$5.
- **Alternar status** marca alguém como Pago/Pendente (é só informativo).
- **Exportar** gera o texto de pagamentos (§12.7) — **copie e cole no grupo**.

> O desconto vale **mesmo que o indicado ainda não tenha pago**, e é só **indicação
> direta** (quem o seu indicado indicar não te dá desconto).

---

## 2. Quando os jogos começarem: rodada a rodada

### 2.1 Montar a rodada

Menu **Rodadas e jogos → Montar rodada**.
- Escolha a **fase** (16-avos, oitavas, …). Para a **rodada final**, são **2 jogos**
  (3º lugar + final) — o sistema aceita normalmente.
- Informe **quantos jogos** e, pra cada um, **selecione os dois times do catálogo**
  (esquerda e direita). A posição importa só pro placar (2×1 ≠ 1×2); **não é**
  mando de campo.
- Depois de montar, **Exportar → mensagem da rodada** (§12.1) e cole no grupo pra
  pedir os palpites.

> **Estado da rodada** (Montada → Palpites abertos → Resultados → Encerrada) é só um
> **guia** pra você se situar. Ele **não trava nada** — você pode corrigir palpite
> ou resultado a qualquer momento, em qualquer estado.

### 2.2 Registrar os palpites

Menu **Palpites → Registrar**.
- Escolha a **rodada**, depois o **participante**. Digite o placar de **cada jogo**
  (o que a pessoa te mandou no WhatsApp).
- Se já havia palpite, o sistema **pré-preenche** — relançar **corrige** (não
  duplica).
- **Ver quem falta:** **Palpites → pendências**. Exporte (§12.8) e cole no grupo pra
  cobrar quem não enviou. (Quem mandou **zero** palpites na rodada aparece como
  pendente; quem mandou parcial conta como "palpitou".)
- **Exportar tabela de palpites** (§12.2) quando quiser mostrar todos os chutes.

### 2.3 Lançar resultados (e a pontuação sai sozinha)

Menu **Resultados e pontuação → Registrar/editar**.
- Escolha a **rodada → jogo** e digite o **placar real (90 min)**. Só o tempo normal
  conta; empate é palpite válido.
- A pontuação **recalcula sozinha** — você não soma nada à mão. Errou o placar?
  **Reedite**: a classificação se ajusta na hora (nada de pontos fica "salvo
  errado").
- **Exportar:** resumo do jogo (§12.3), resumo da rodada (§12.4) e classificação
  geral (§12.5) — cole no grupo. Pontuação: **placar exato = 3, resultado certo = 1,
  errado = 0**.

---

## 3. Visão geral rápida

Menu **Resumo geral** (topo): num relance, os pagamentos (quantos pagaram, recebido
vs. esperado, falta) e a **rodada atual** (qual, estado, quantos já palpitaram).
Use no começo de cada sessão pra saber onde o bolão está.

---

## 4. Backup — faça isto religiosamente

Enquanto a Entrega 2 (banco online) não existe, **todos os dados vivem só no seu
PC**. Um backup regular é a única rede de segurança contra perder semanas de
digitação.

**Rotina recomendada:** rode um backup **depois de cada sessão** em que você digitou
bastante (palpites de uma rodada, resultados de um dia).

Com o banco no ar:
```
npm run db:backup
```
Gera `backend/backups/bolao_AAAA-MM-DD_HHMM.sql`. Confira que o arquivo **não está
vazio** (alguns KB). De vez em quando, **copie a pasta `backups/` pra outro lugar**
(pendrive, nuvem) — backup no mesmo PC não protege contra o PC pifar.

> Esses dumps são o que vai **migrar os dados pro banco central** quando a Entrega 2
> subir. O backup de hoje é o insumo da migração de amanhã.

---

## 5. Se algo der errado

- **"Não consegui falar com o banco":** o Postgres não está no ar. `docker compose
  up -d` na raiz e tente de novo.
- **`docker` não reconhecido / daemon:** abra o Docker Desktop e espere
  "Engine running".
- **Mensagem de erro amigável (⚠️) no menu:** o sistema avisou o que houve e
  **continua operando** — leia a mensagem, corrija a entrada e siga.
- **Travou de vez:** Ctrl+C sai limpo; rode `npm run cli` de novo. Os dados estão
  salvos no banco.

---

## Referência rápida de comandos

```
docker compose up -d      # sobe o banco (raiz do projeto)
docker compose ps         # confere se o banco está no ar
docker compose down       # desliga o banco (dados persistem)
cd backend && npm run cli # abre o menu do sistema
npm run db:backup         # gera um dump do banco em backend/backups/
npm run db:seed           # recarrega o catálogo de seleções (idempotente)
```

---

*Entrega 1 — sistema via terminal, local. A Entrega 2 (web, online, login) virá
durante o torneio e reusa este mesmo núcleo; nada do que você operar aqui é
descartável.*