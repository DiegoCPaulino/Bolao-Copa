# Documento de Contexto — Sistema de Gestão de Bolão (Copa do Mundo 2026)

**Versão:** 8 — documento base do projeto (com plano de entrega em duas fases)
**Atualizado em:** 22/06/2026
**Natureza:** documento de contexto funcional. Define *o que* o sistema é e faz, e **em que ordem** será entregue (seção 2). As escolhas de *como* (stack, modelagem física, autenticação, deploy) ficam no documento técnico/arquitetura (ver seção 18).

---

## Histórico de versões

| Versão | O que mudou |
|--------|-------------|
| 1–6 | Construção incremental do escopo funcional: regras de pontuação, desempate, indicação/valor a pagar, catálogo, ciclo de vida da rodada, perfil, exportação total para WhatsApp, escala (~63), etc. |
| 7 | Versão funcional fechada e detalhada (glossário, telas, exemplos dos artefatos, modelo conceitual armazenado × derivado). |
| **8** | **Adicionado o plano de entrega em duas fases** (seção 2), por restrição de tempo até o início do mata-mata. **Fase 1 (meta 27/06):** sistema **funcional, local, via terminal**, com banco de dados feito — todos os cadastros, cálculos, palpites, resultados, classificação e exportações para WhatsApp. **Fase 2 (depois):** front-end, deploy, multi-dispositivo, autenticação e polimento. **Nenhuma regra de negócio mudou** — apenas a ordem de entrega. |

---

## 1. Propósito deste documento

Descreve, em nível conceitual e funcional, o sistema a ser desenvolvido — com detalhe suficiente para servir de **fonte única de verdade** durante o desenvolvimento. Captura o que o sistema é, o problema que resolve, o que faz, o que não faz, suas regras de negócio, suas telas, suas saídas e **a ordem em que tudo será entregue**.

As escolhas técnicas ficam de fora **por opção de organização**: a separação entre o *o quê* (domínio/requisitos) e o *como* (arquitetura) mantém este documento estável mesmo que a tecnologia mude.

## 2. Estratégia de entrega: duas fases

**Contexto.** O início do mata-mata (16-avos) acontece no fim de junho, e o prazo prático para o sistema estar operando é **27/06/2026**. Como o tempo de desenvolvimento até lá é curto, o projeto é dividido em **duas fases**. Esta divisão **não altera nenhuma regra de negócio** (tudo nas seções 8 a 14 continua valendo); ela define **a ordem de entrega** e **o que precisa estar pronto primeiro**.

**Princípio da divisão.** Primeiro o **núcleo funcional** — as regras, os cálculos, os dados e as saídas —, operável por uma interface mínima. Só depois a **camada de apresentação e operação** — front-end, deploy, multi-dispositivo. A lógica de negócio é **a mesma** nas duas fases: na Fase 2, o front-end e o deploy passam a ser apenas novos "clientes" do mesmo núcleo já pronto. Por isso **o trabalho da Fase 1 não é descartável** — ele é a fundação reaproveitada pela Fase 2 (desde que a regra de negócio seja escrita separada da interface de terminal).

### Fase 1 — Sistema funcional (meta: 27/06)

**Objetivo:** ter algo que o organizador **já consegue usar de verdade** para tocar o bolão desde o começo, mesmo sem interface gráfica.

- **Forma:** uso **local, no PC do organizador**, via **terminal (linha de comando)**. Sem front-end gráfico, sem visual.
- **Banco de dados:** **feito e funcionando localmente**, com os dados persistidos entre usos (o bolão dura semanas — não pode perder nada ao fechar o programa).
- **Sem deploy, sem multi-dispositivo, sem autenticação:** por ser local e de uso exclusivo do organizador no próprio PC, **login não é necessário** nesta fase. (Auth passa a fazer sentido só quando o sistema ficar online, na Fase 2.)
- **Funcionalidades de domínio completas:**
  - cadastrar/editar participantes (nome, apelido, indicado por);
  - cálculo do **valor a pagar** (regra de indicação + piso) e **controle de pagamentos** (status + totais esperado/recebido/falta);
  - montar **rodadas** a partir do catálogo de seleções;
  - registrar **palpites** (por participante) e **resultados** (90 min);
  - **cálculo automático** de pontuação e classificação (com desempate);
  - **"quem ainda não palpitou"** por rodada;
  - **todas as exportações de texto para o WhatsApp** (impressas no terminal, prontas para copiar) — **prioridade máxima**, pois é o que viabiliza a comunicação no grupo.
- **Ordem interna sugerida (pela urgência real):** primeiro **participantes + indicações + pagamentos** e suas exportações — porque é o que já está acontecendo agora (gente entrando, pagando, indicando). Em seguida **rodadas + palpites + resultados + classificação**, que entram em uso quando os jogos começarem.
- **Por que isso basta:** o organizador precisa começar a "agitar" o bolão (gente pagando, indicando, palpitando). Sem sistema, o controle manual de dezenas de pessoas vira caos. Um núcleo funcional no terminal já resolve a operação.

### Fase 2 — Sistema acabado (depois de já estar em uso)

**Objetivo:** transformar o núcleo funcional num produto completo e confortável.

- **Front-end** web responsivo (as telas da seção 12), com interface limpa e agradável no mobile e no desktop.
- **Deploy/online** com **armazenamento central** e **acesso multi-dispositivo** (celular + computador, dados consistentes).
- **Autenticação pessoal do organizador** (necessária quando o sistema fica acessível pela internet).
- **Refinamentos de usabilidade:** painel de visão geral visual, busca/filtro/ordenação ricos, etc.

> As **telas** da seção 12 e os requisitos de **online/multi-dispositivo/autenticação** valem **para a Fase 2**. Na **Fase 1**, cada "tela" corresponde a um **comando/menu equivalente no terminal**.

## 3. Visão geral

Aplicação de **uso pessoal e exclusivo do organizador** de um bolão da Copa do Mundo 2026. Ela centraliza:

- a organização das **rodadas** do mata-mata e seus **jogos**;
- o registro dos **palpites** de cada participante;
- o registro dos **resultados reais** (90 min);
- o **cálculo automático** da pontuação e da classificação;
- o **controle de pagamentos**, incluindo a regra de desconto por indicação;
- e a **geração de textos prontos para o WhatsApp** a partir de praticamente qualquer informação do sistema.

O sistema **não é multiusuário**: os participantes não acessam nada. Toda a comunicação com eles acontece no grupo de WhatsApp, e o organizador é a ponte (copia os textos do sistema e cola no grupo).

## 4. Glossário (vocabulário do projeto)

- **Organizador:** a única pessoa que usa o sistema. Dono do bolão.
- **Participante:** apostador. Existe apenas como registro no sistema (nome, apelido, indicação, pagamento); não tem acesso.
- **Seleção:** uma seleção nacional do catálogo (nome + bandeira/emoji).
- **Rodada:** uma fase do mata-mata (16-avos, oitavas, etc.). A última rodada reúne 3º lugar + final (2 jogos).
- **Jogo:** confronto entre duas seleções dentro de uma rodada.
- **Palpite:** o placar (90 min) que um participante chuta para um jogo.
- **Resultado:** o placar real (90 min) de um jogo.
- **Indicação:** quando um participante traz outro para o bolão; gera desconto para quem indicou.
- **Valor a pagar:** quanto um participante deve, já com os descontos (calculado, não digitado).
- **Artefato / exportação:** texto formatado pronto para colar no WhatsApp.

## 5. Problema que o sistema resolve

Hoje o processo é manual e repetitivo a cada jogo e rodada: montar a lista de jogos, enviar no grupo, transcrever os palpites recebidos, conferir cada um contra o placar real, somar os pontos, remontar a classificação **e ainda controlar na mão, para dezenas de pessoas, quem pagou, quanto cada um deve e os descontos por indicação**.

Com cerca de **63 participantes**, isso é muito trabalho e propenso a erro. O sistema automatiza a organização, o cálculo, o controle de pagamentos e a formatação das mensagens — deixando para o organizador apenas as entradas de dados e a cópia dos textos prontos.

## 6. Contexto e modelo de uso

- **Usuário único:** o organizador.
- **Participantes vs. usuário:** o organizador *cadastra participantes* (registros), mas o único *usuário* é ele. Cada participante tem uma **identidade própria gerada pelo sistema** (não digitada), usada para referenciá-lo — por exemplo, na indicação e nos palpites.
- **Escala:** ~63 participantes. Não é "escala" de software, mas exige listas claras, com busca, filtro e ordenação (Fase 2; na Fase 1, filtros simples no terminal).
- **Ciclo copiar/colar:** o sistema gera textos; o organizador cola no grupo e traz de volta palpites e resultados.
- **Armazenamento (por fase):** Fase 1 = **banco local no PC**; Fase 2 = **armazenamento central online** com acesso multi-dispositivo e login pessoal.

## 7. Escopo da competição

- Cobre **toda a fase de mata-mata**, dos **16-avos de final até a final**.
- A Copa de 2026 tem 48 seleções; o mata-mata começa no *round of 32* (= "16-avos de final" em PT-BR).
- **5 rodadas sequenciais:** 16-avos → oitavas → quartas → semifinais → rodada final (3º lugar + final, 2 jogos).
- **Pontuação acumulada** (pontos corridos): a classificação geral é o somatório de todas as rodadas já disputadas.
- **Jogos por fase:** 16-avos = 16 · oitavas = 8 · quartas = 4 · semifinais = 2 · rodada final = 2 — **total de 32 jogos**.
- **Fora do escopo:** a fase de grupos.

## 8. Regras de negócio

### 8.1 Base da pontuação
Os palpites valem **somente para o tempo normal (90 minutos)**. Prorrogação e pênaltis **não contam**, mesmo no mata-mata. Consequência: o **empate é um palpite válido**, ainda que o confronto real seja decidido depois.

### 8.2 Critério de pontos
- **Placar exato** → **3 pontos**
- **Resultado certo** (acertou o vencedor OU o empate), mas placar errado → **1 ponto**
- **Resultado errado** → **0 pontos**

### 8.3 Exemplos de pontuação
**Resultado real 2 x 1:** `2x1 → 3` · `3x1 → 1` · `1x0 → 1` · `1x1 → 0` · `0x1 → 0`
**Resultado real 1 x 1:** `1x1 → 3` · `2x2 → 1` · `2x1 → 0`

### 8.4 Palpites ausentes
Participante que não enviar palpite para um jogo recebe **0 ponto naquele jogo** (sem penalidade extra).

### 8.5 Desempate da classificação
Com a mesma pontuação total, ordenar por:
1. Maior **número de placares exatos** (palpites de 3 pontos);
2. Maior **número de resultados certos** (palpites de 1 ponto ou mais);
3. Persistindo o empate (raríssimo): **mesma posição**, com ordem manual opcional do organizador.

### 8.6 Correções
O organizador pode **editar palpites e corrigir resultados a qualquer momento** — **não há trava**. Qualquer correção **recalcula automaticamente** a pontuação da rodada e a classificação geral.

### 8.7 Valor a pagar e regra de indicação
- **Valor base do bolão:** **R$ 40** por participante.
- **Desconto por indicação:** cada pessoa indicada que **entra** (é cadastrada) dá **R$ 5 de desconto ao indicador** — **mesmo que o indicado ainda não tenha pago**.
- **Piso:** todo participante paga **no mínimo R$ 5** (desconto máximo efetivo R$ 35, com 7 indicados).
- **Apenas indicação direta:** Diego indica João → Diego paga R$ 35. João depois indica outros 3 → **Diego continua em R$ 35**; o benefício é só do João.
- **Fórmula:** `valor a pagar = máximo( 5 ; 40 − 5 × (nº de indicados diretos que entraram) )`
- **Registro:** o campo "indicado por" é **opcional** e preenchido **selecionando um participante já existente** (não se digita).

| Indicados diretos | Valor | | Indicados | Valor |
|---|---|---|---|---|
| 0 | R$ 40 | | 4 | R$ 20 |
| 1 | R$ 35 | | 5 | R$ 15 |
| 2 | R$ 30 | | 6 | R$ 10 |
| 3 | R$ 25 | | 7+ | R$ 5 (piso) |

### 8.8 Status de pagamento e totais
- Status manual por participante: **Pago** ou **Pendente** (padrão **Pendente**). É **apenas informativo** — não afeta pontuação.
- Totais no agregado: **Total esperado** (soma dos valores a pagar) · **Total recebido** (soma dos "Pago") · **Falta receber** (esperado − recebido).

#### 8.8.1 "Exibir como pago no grupo" (override de apresentação)
Às vezes o organizador quer que um participante **apareça como pago na exportação do
WhatsApp** mesmo sem ter pago (ex.: combinou o pagamento, ainda não recebeu). Para isso
existe a marcação **"exibir como pago no grupo"** por participante (padrão **desligado**).

- **É override de APRESENTAÇÃO, não um status.** Não existe um terceiro valor de status: a
  marcação é um **sinalizador independente** (ortogonal, como "isento"). O **status real**
  (Pago/Pendente) continua sendo a **verdade** e é o que vale internamente.
- **Duas visões da mesma verdade** (ambas calculadas sob demanda, nada novo armazenado além
  do próprio sinalizador, que é **entrada** do organizador):
  - **Visão interna** (painel, listagens, perfil, tela do organizador): mostra **sempre o
    status real**. Quem está "exibir como pago" e ainda não pagou aparece como **Pendente**
    com um **marcador discreto** ("exibido como pago") — **nunca** como Pago puro.
  - **Visão pública** (somente a **exportação** do WhatsApp): o participante marcado entra
    como **Pago**.
- **Consistência obrigatória na exportação:** na visão pública esses participantes contam
  como pagos **também nos totais** (Recebido/Falta) e em **qualquer número de prêmio/pote**
  que o texto mostrar — senão a soma denunciaria o ajuste. A **visão interna mantém os
  totais verdadeiros**. (Só `Recebido`/`Falta`/`prêmio atual` mudam entre as visões;
  `Esperado`/`prêmio potencial` independem de status e são iguais nas duas.)
- **Onde se altera:** na **edição do participante** (ao lado de "isento"). Não há tela nem
  número que use a visão pública fora da exportação do WhatsApp.

### 8.8.2 Isento de pagamento
Um participante pode ser marcado como **isento** (padrão **desligado**). Ele **disputa o
bolão normalmente** (palpites, pontos, classificação), mas fica **fora da cobrança**.

- **Efeito:** o isento **não tem valor a pagar**, **não entra nos totais**
  (esperado/recebido/falta) e **não aparece** no artefato de pagamentos (§13.7). É um
  **sinalizador independente** (ortogonal ao status Pago/Pendente), gravado como **fato** —
  nunca um "valor R$ 0" derivado.
- **Não desfaz indicação:** um **indicado** isento ainda **conta** para o desconto de quem o
  indicou — ele **entrou** no bolão (§8.7). A isenção tira o próprio isento da cobrança; não
  anula a indicação que ele gerou.
- **Onde se altera:** na edição do participante (ao lado de "exibir como pago").

### 8.9 Premiação (divisão do pote)
O sistema **calcula e exibe** a divisão do pote arrecadado. **Não movimenta dinheiro** (sem
gateway/transação — ver §15); apenas mostra os números.

- **Divisão fixa: 75% para a premiação · 25% para o organizador.** A fração da premiação é
  uma constante de domínio (`FRACAO_PREMIACAO = 0,75`); o organizador recebe **o resto** da
  divisão. Arredonda-se **só a premiação** e dá-se o resto ao organizador, de modo que
  **premiação + organizador = total exato** sempre (sem centavo perdido no arredondamento).
- **O pote é o total de pagamento** (a soma dos valores a pagar — §8.8). Como o pagamento tem
  duas leituras (esperado/recebido), a premiação também tem duas:
  - **Prêmio atual** = 75% sobre o **recebido** (o que já entrou);
  - **Prêmio potencial** = 75% sobre o **esperado** (se todos pagarem);
  - de forma análoga, o **ganho do organizador** (atual/potencial) são os 25% sobre
    recebido/esperado.
- **Público vs. privado:** a exportação de pagamentos para o grupo (§13.7) mostra **apenas a
  premiação** (atual / potencial). O **pote bruto, os totais esperado/recebido/falta e a
  fatia de 25% do organizador são privados** — aparecem só na visão interna (painel/resumo
  geral), nunca no texto do grupo.
- **Interação com "exibir como pago" (§8.8.1):** como o prêmio atual deriva do **recebido**,
  na **visão pública** (exportação) quem está marcado "exibir como pago" entra no recebido e,
  portanto, **no prêmio atual** — mantendo o texto internamente consistente. A **visão
  interna** usa o recebido **real**.

## 9. Funcionalidades principais

**Participantes e pagamentos**
1. **Gerenciar participantes** — nome, **apelido** (opcional, p/ homônimos), **indicado por** (opcional, selecionando existente), **status**, **isento** (§8.8.2) e **exibir como pago no grupo** (§8.8.1). **Sem trava:** a lista e os dados podem ser editados a qualquer momento — correções são sempre livres (§8.6).
2. **Buscar/filtrar/ordenar participantes** — por nome/apelido, status, valor, pontuação. (Rico na Fase 2; simples na Fase 1.)
3. **Perfil do participante** — visão individual consolidada (ver 12.4).
4. **Controle de pagamentos** — status, valor e **totais** (esperado/recebido/falta).

**Rodadas, palpites e resultados**
5. **Catálogo de seleções** — pré-cadastradas (nome + bandeira), selecionadas ao montar rodadas.
6. **Montar rodada** — seleções par a par (esquerda × direita) por jogo; gera a mensagem da rodada.
7. **Registrar palpites** — por participante, listando os jogos da rodada.
8. **Acompanhar quem já palpitou** — por rodada, ver quem falta (e exportar a cobrança).
9. **Registrar resultados** — placar real (90 min) por jogo.
10. **Calcular/atualizar pontuação** — recálculo automático a cada resultado.

**Organização e saída**
11. **Painel de visão geral** — resumo do estado do bolão (pagamentos, pote, rodada atual). Visual na Fase 2; resumo no terminal na Fase 1.
12. **Exportar para o WhatsApp** — *qualquer* lista/visão vira texto formatado copiável (ver seção 13).
13. **Ciclo de vida da rodada** — estados que orientam o organizador (ver 11).

## 10. (reservado)

*Seção fundida com 9 — sem conteúdo próprio.*

## 11. Ciclo de vida da rodada

Quatro estados em sequência. O estado é um **guia** (não uma trava — correções são sempre livres):

1. **Montada** — rodada criada e confrontos definidos a partir do catálogo. A "mensagem da rodada" pode ser gerada.
2. **Palpites abertos** — coletando no grupo e **registrando os palpites**. Acompanha-se "quem ainda falta palpitar".
3. **Resultados em andamento** — jogos começaram; **registram-se os placares** e a pontuação vai sendo calculada. Gera "resumo do jogo".
4. **Encerrada** — todos os resultados lançados; gera o "resumo da rodada". A classificação reflete o acumulado.

## 12. Telas do sistema (mapa de navegação)

> **Aplicabilidade por fase:** as telas abaixo são da **Fase 2** (front-end). Na **Fase 1**, cada uma corresponde a um **comando/menu de terminal** equivalente. **Toda tela/lista oferece exportar para o WhatsApp.**

**12.1 Login** — acesso do organizador (Fase 2; na Fase 1 não há login).
**12.2 Painel de visão geral** — pagamentos (ex.: 40/63, recebido vs. esperado, falta) e rodada atual (estado, quantos já palpitaram). Atalhos.
**12.3 Participantes** — lista com busca/filtro/ordenação; cada item mostra nome/apelido, quem indicou, status e valor; cadastrar/editar; clicar abre o perfil. Exportável.
**12.4 Perfil do participante** — indicações (quem o indicou e quem ele indicou), pagamento (valor + status), desempenho (placares exatos, pontos por rodada, posição). Responde "como eu estou?".
**12.5 Pagamentos** — status + valor por participante, com filtro/ordenação e os totais (esperado/recebido/falta). Exportável.
**12.6 Rodadas** — as 5 rodadas com seus estados; ação montar rodada.
**12.7 Rodada (detalhe)** — jogos; registrar palpites e ver quem falta; registrar resultados; pontuação; artefatos da rodada.
**12.8 Catálogo de seleções** — seleções pré-carregadas (nome + bandeira), dado de referência.

- **Seleção especial "A definir"** (id estável `a-definir`, bandeira 🏴): placeholder usado quando um lado do confronto ainda **não foi decidido** (depende de um jogo anterior do mata-mata). O organizador monta o jogo com "A definir" no lado vazio e **edita depois**, trocando pela seleção real quando ela sair. É uma seleção normal do catálogo (flui por seleção/jogo/exportação).
- **Exceção da regra "seleções de um jogo devem ser diferentes":** dois "A definir" no **mesmo** jogo é **válido** — são dois espaços vazios, não a mesma seleção repetida. A "A definir" é reconhecida pelo **id** (`a-definir`), nunca pelo nome.

## 13. Artefatos e exportação para WhatsApp

**Princípio central:** *tudo que o organizador vê pode virar um texto formatado pra colar no grupo.* **Cópia/exportação fácil é a prioridade número um** (e já vale na Fase 1, impressa no terminal).

**Formatação:** o WhatsApp **não renderiza tabelas**. Suporta `*negrito*`, `_itálico_`, monoespaçado (crases triplas), quebras de linha e **emojis** (incl. bandeiras 🇧🇷). Usar **alinhamento por monoespaçado e/ou emojis** em vez de tabelas.

> Exemplos **ilustrativos** — texto e emojis podem ser refinados; o que importa é a estrutura e a informação.

**13.1 Mensagem da rodada**
```
🏆 *BOLÃO COPA 2026 — OITAVAS DE FINAL*

⚽ *J1* 🇧🇷 Brasil × Argentina 🇦🇷
⚽ *J2* 🇫🇷 França × Espanha 🇪🇸
⚽ *J3* 🇵🇹 Portugal × Alemanha 🇩🇪
```
> Sem linha de instrução entre o título e os confrontos. Cada jogo usa **⚽ *J{n}*** (a
> `ordem` do jogo, uniforme de 1 a 16) — mesma referência "J1/J2" da tabela de palpites
> (13.2) e do resumo do jogo (13.3).

**13.2 Tabela de palpites** — agrupada **por jogo** (cabeçalho no formato da §13.1; palpites em ordem alfabética; só quem palpitou; jogo sem palpites mostra o placeholder).
```
📋 *PALPITES — OITAVAS*

⚽ *J1* 🇧🇷 Brasil × Argentina 🇦🇷
Ana 1x0
Diego 2x1

⚽ *J2* 🇫🇷 França × Espanha 🇪🇸
_(sem palpites ainda)_
```

**13.3 Resumo do jogo**
```
✅ *RESULTADO — Jogo 1*
🇧🇷 Brasil  2 x 1  Argentina 🇦🇷

🎯 Diego  2x1  → *3 pts* (cravou!)
✔️ Lucas  1x0  → 1 pt
❌ Ana    1x1  → 0 pt
```

**13.4 Resumo da rodada**
```
🏁 *FIM DAS OITAVAS*

🥇 Diego — 8 pts  🔥 destaque
🥈 Lucas — 5 pts
🥉 Ana   — 3 pts
```

**13.5 Classificação geral**
```
📊 *CLASSIFICAÇÃO GERAL*

🥇 Diego — 21 pts
🥈 Lucas — 18 pts
🥉 Ana — 15 pts
4º João — 12 pts
```
> Pódio com medalhas nas 3 primeiras posições (🥇🥈🥉), numeração normal da 4ª em
> diante. As medalhas seguem a ordem da classificação (cascata §8.5) — o formatador
> não reordena. Título sem contexto entre parênteses.

**13.6 Lista de participantes**
```
👥 *PARTICIPANTES (63)*
1. Ana
2. Diego
3. João
```
> Lista numerada em ordem alfabética (apelido como critério secundário, para
> homônimos). A contagem no título é mantida.

**13.7 Pagamentos**
```
💰 *PAGAMENTOS*

✅ *Pagos*
• Diego — R$ 35
• Lucas — R$ 40

⏳ *Pendentes*
• Ana — R$ 40
• João — R$ 30

🏆 *Prêmio*: R$ 1.200 / R$ 1.800
```
> **Intencional (alinhado ao código):** o texto do grupo **omite** os três totais
> (esperado/recebido/falta) e mostra a **premiação** na última linha — *atual / potencial*
> (§8.9). Pote bruto, totais e os 25% do organizador são **privados** (só no painel/resumo
> geral), nunca vão para o grupo. Seção vazia (ex.: ninguém pago) é omitida por completo.

**13.8 Pendências de palpite** — em **lista** (um nome por linha, marcador "•", ordem alfabética).
```
⚠️ *FALTAM PALPITES — OITAVAS*
• Ana
• João
• Pedro
Mandem antes dos jogos! ⏰
```

## 14. Modelo conceitual (entidades) — visão não técnica

Separar o que é **armazenado** do que é **derivado** (calculado na hora): derivado **não se guarda**, para evitar inconsistência. (Vale nas duas fases — o banco da Fase 1 já segue isso.)

**Seleção (catálogo)** — *armazenado:* nome; bandeira (emoji).

**Participante** — *armazenado:* identidade própria (gerada pelo sistema); nome; apelido (opcional); indicador (opcional — referência a **outro Participante**, relação **auto-referente**); status de pagamento (Pago/Pendente); **isento** de pagamento (booleano, padrão não — §8.8.2); **exibir como pago no grupo** (booleano, padrão não — §8.8.1).

**Rodada** — *armazenado:* fase; ordem; estado (montada/palpites abertos/resultados em andamento/encerrada); contém vários **Jogos**.

**Jogo** — *armazenado:* rodada; seleção da esquerda e da direita (**posicionais** — ordem só importa para o placar, 2x1 ≠ 1x2; não é mando de campo); ordem na rodada; placar real (90 min) quando disponível.

**Palpite** — *armazenado:* participante + jogo; placar palpitado (gols esquerda × gols direita).

**Derivados (calculados, não armazenados):**
- pontos de um palpite (0/1/3); pontos por rodada e pontuação geral;
- classificação (com desempate); placares exatos por participante;
- valor a pagar = `máximo(5; 40 − 5 × nº de indicados diretos)`;
- totais de pagamento (esperado, recebido, falta);
- quem ainda não palpitou numa rodada.

**Relacionamentos:** Rodada 1—N Jogo · Jogo 1—N Palpite · Participante 1—N Palpite · Participante 0..1—N Participante (indicação auto-referente) · Jogo N—2 Seleção.

## 15. O que o sistema NÃO faz (fora de escopo)

- **Não tem login/acesso para participantes** — apenas o organizador (e, na Fase 1, nem login do organizador).
- **Não envia mensagens automaticamente** (o organizador copia e cola).
- **Não busca resultados** automaticamente.
- **Não cobre a fase de grupos.**
- **Não movimenta dinheiro de verdade** (sem transações/gateway): o sistema **calcula e exibe** o valor devido, **registra** Pago/Pendente e **calcula/exibe a premiação** (divisão do pote 75/25 — §8.9), mas **não desembolsa nem processa pagamentos**.
- **Não possui** notificações, chat interno nem rede social.

## 16. Requisitos não-funcionais

- **Cópia/exportação fácil é a prioridade número um** (já na Fase 1).
- **Formatação amigável ao WhatsApp** em todas as saídas (sem tabelas).
- **Persistência confiável dos dados** — Fase 1: banco local; Fase 2: armazenamento central.
- **Interface limpa e confortável no mobile e no desktop** — **Fase 2**.
- **Clareza com dezenas de participantes** (~63): busca, filtro e ordenação — ricos na Fase 2.
- **Online + autenticação pessoal + multi-dispositivo** — **Fase 2**.
- **Segurança proporcional ao uso:** usuário único, sem dados sensíveis de terceiros. Mesmo simples, o projeto deve ser feito com **boas práticas** (bem construído de ponta a ponta).

## 17. Decisões fechadas (consolidado)

| # | Tema | Decisão | Fase |
|---|------|---------|------|
| 1 | Escopo das rodadas | Todo o mata-mata (5 rodadas, 32 jogos). | 1 |
| 2 | Base da pontuação | Apenas 90 min; empate é palpite válido. | 1 |
| 3 | Critério de pontos | Exato = 3; certo = 1; errado = 0. | 1 |
| 4 | Palpite ausente | 0 ponto no jogo. | 1 |
| 5 | Desempate | Exatos → certos → empate mantido. | 1 |
| 6 | Correções | Livres; recálculo automático. | 1 |
| 7 | Valor base | R$ 40 por participante. | 1 |
| 8 | Desconto por indicação | −R$ 5 por indicado direto que entra. | 1 |
| 9 | Piso | Mínimo R$ 5. | 1 |
| 10 | Indicação | Apenas direta; por seleção de existente. | 1 |
| 11 | Status de pagamento | Pago/Pendente, informativo. | 1 |
| 12 | Totais | Esperado, recebido, falta. | 1 |
| 13 | Catálogo de seleções | Pré-carregado (nome + bandeira). | 1 |
| 14 | Montagem da rodada | Manual, do catálogo. | 1 |
| 15 | Posicionamento dos times | Posicional (esquerda × direita). | 1 |
| 16 | Entrada de palpites | Por participante. | 1 |
| 17 | Lista de participantes | Editável a qualquer momento — sem trava; correções livres (§8.6). | 1 |
| 18 | Ciclo de vida da rodada | montada → palpites → resultados → encerrada. | 1 |
| 19 | 3º lugar + final | Uma rodada com 2 jogos. | 1 |
| 20 | Perfil do participante | Visão individual consolidada. | 1 |
| 21 | Exportação WhatsApp | Tudo exportável (no terminal na Fase 1). | 1 |
| 22 | Quem ainda não palpitou | Acompanhamento + exportação. | 1 |
| 23 | Apelido | Campo opcional (homônimos). | 1 |
| 24 | Banco de dados | Local na Fase 1. | 1 |
| 25 | Interface gráfica (telas) | Front-end web responsivo. | 2 |
| 26 | Painel/busca/filtro ricos | Versão visual e completa. | 2 |
| 27 | Online + deploy | Armazenamento central. | 2 |
| 28 | Multi-dispositivo | Celular + computador. | 2 |
| 29 | Autenticação | Login pessoal do organizador. | 2 |
| 30 | Seleção "A definir" | Placeholder (id `a-definir`, 🏴) p/ lado não decidido; dois "A definir" no mesmo jogo é válido (ver §12.8). | 1 |

*Não há pontos funcionais em aberto. Mudou apenas a ordem de entrega (seção 2).*

## 18. Próximo passo (fora deste documento)

O próximo passo é o **documento técnico/arquitetura**, focado primeiro na **Fase 1**:
- **Modelagem física de dados:** as entidades da seção 14 viram tabelas e relacionamentos (destaque para a **indicação auto-referente** e para os **campos derivados** calculados em vez de armazenados);
- **Como rodar localmente:** banco local + uma interface de terminal, com a **regra de negócio separada da camada de terminal** (para a Fase 2 reaproveitar tudo);
- Depois, para a Fase 2: **stack do front-end, autenticação e deploy**.

Este documento de contexto permanece como a **fonte de verdade** do comportamento e das regras.

---

*Documento de contexto funcional. Não inclui definições de stack, arquitetura técnica ou implementação — apenas o escopo, o comportamento, as regras e a ordem de entrega do sistema.*