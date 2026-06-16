# Documento de Contexto — Sistema de Gestão de Bolão (Copa do Mundo 2026)

**Versão:** 7 — **FINAL** (documento base do projeto)
**Atualizado em:** 16/06/2026
**Natureza:** documento de contexto funcional. Define *o que* o sistema é e faz, em detalhe suficiente para guiar o desenvolvimento sem ambiguidade. As escolhas de *como* (stack, modelagem física de dados, autenticação, deploy) ficam no documento técnico/arquitetura (ver seção 18).

---

## Histórico de versões

| Versão | O que mudou |
|--------|-------------|
| 1–4 | Escopo (todo o mata-mata); pontuação (90 min); desempate; palpites; catálogo e montagem por seleção; times posicionais; ciclo de vida da rodada; multi-dispositivo; 3º lugar + final numa rodada; aplicação completa (banco, autenticação, deploy). |
| 5 | Regra de indicação (−R$5 por indicado, piso R$5, base R$40); valor a pagar derivado; perfil do participante; controle de pagamentos. |
| 6 | Confirmado: desconto vale ao entrar mesmo sem pagar; só indicação direta; totais esperado vs. pago. Princípio "tudo exportável pro WhatsApp"; mapa de telas; escala (~63 participantes). |
| **7 (FINAL)** | Incorporadas como decisões: **busca/filtro/ordenação** nas listas; **painel de visão geral**; **controle de "quem ainda não palpitou"** (com exportação); **apelido** no cadastro. Documento expandido: cada tela detalhada, **exemplos reais dos textos do WhatsApp**, modelo conceitual com atributos e separação entre dados **armazenados** e **derivados**. |

---

## 1. Propósito deste documento

Descreve, em nível conceitual e funcional, o sistema a ser desenvolvido — com detalhe suficiente para servir de **fonte única de verdade** durante o desenvolvimento. Captura o que o sistema é, o problema que resolve, o que faz, o que não faz, suas regras de negócio, suas telas e suas saídas.

As escolhas técnicas ficam de fora **por opção de organização**: a separação entre o *o quê* (domínio/requisitos) e o *como* (arquitetura) mantém este documento estável mesmo que a tecnologia mude.

## 2. Visão geral

Aplicação web de **uso pessoal e exclusivo do organizador** de um bolão da Copa do Mundo 2026. Ela centraliza:

- a organização das **rodadas** do mata-mata e seus **jogos**;
- o registro dos **palpites** de cada participante;
- o registro dos **resultados reais** (90 min);
- o **cálculo automático** da pontuação e da classificação;
- o **controle de pagamentos**, incluindo a regra de desconto por indicação;
- e a **geração de textos prontos para o WhatsApp** a partir de praticamente qualquer informação do sistema.

O sistema **não é multiusuário**: os participantes não acessam nada. Toda a comunicação com eles acontece no grupo de WhatsApp, e o organizador é a ponte (copia os textos do sistema e cola no grupo).

## 3. Glossário (vocabulário do projeto)

Para alinhar termos e evitar ambiguidade no desenvolvimento:

- **Organizador:** a única pessoa que usa o sistema (faz login). Dono do bolão.
- **Participante:** apostador. Existe apenas como registro no sistema (nome, apelido, indicação, pagamento); não tem acesso.
- **Seleção:** uma seleção nacional do catálogo (nome + bandeira/emoji).
- **Rodada:** uma fase do mata-mata (16-avos, oitavas, etc.). A última rodada reúne 3º lugar + final (2 jogos).
- **Jogo:** confronto entre duas seleções dentro de uma rodada.
- **Palpite:** o placar (90 min) que um participante chuta para um jogo.
- **Resultado:** o placar real (90 min) de um jogo.
- **Indicação:** quando um participante traz outro para o bolão; gera desconto para quem indicou.
- **Valor a pagar:** quanto um participante deve, já com os descontos (calculado, não digitado).
- **Artefato / exportação:** texto formatado pronto para colar no WhatsApp.

## 4. Problema que o sistema resolve

Hoje o processo é manual e repetitivo a cada jogo e rodada: montar a lista de jogos, enviar no grupo, transcrever os palpites recebidos, conferir cada um contra o placar real, somar os pontos, remontar a classificação **e ainda controlar na mão, para dezenas de pessoas, quem pagou, quanto cada um deve e os descontos por indicação**.

Com cerca de **63 participantes**, isso é muito trabalho e propenso a erro. O sistema automatiza a organização, o cálculo, o controle de pagamentos e a formatação das mensagens — deixando para o organizador apenas as entradas de dados (palpites e resultados) e a cópia dos textos prontos.

## 5. Contexto e modelo de uso

- **Usuário único:** o organizador, com **login pessoal**.
- **Participantes vs. usuário:** o organizador *cadastra participantes* (registros), mas o único *usuário* é ele. Cada participante tem uma **identidade própria gerada pelo sistema** (não digitada), usada para referenciá-lo — por exemplo, na indicação e nos palpites.
- **Escala:** ~63 participantes. Não é "escala" de software, mas exige listas claras, com busca, filtro e ordenação.
- **Online (deployado):** dados em **armazenamento central**, acessível pela internet.
- **Multi-dispositivo:** o organizador usa celular e computador, com os mesmos dados consistentes.
- **Ciclo copiar/colar:** o sistema gera textos; o organizador cola no grupo e traz de volta palpites e resultados.
- **Interface:** limpa, agradável e confortável tanto no mobile quanto no desktop.

## 6. Escopo da competição

- Cobre **toda a fase de mata-mata**, dos **16-avos de final até a final**.
- A Copa de 2026 tem 48 seleções; o mata-mata começa no *round of 32* (= "16-avos de final" em PT-BR).
- **5 rodadas sequenciais:** 16-avos → oitavas → quartas → semifinais → rodada final (3º lugar + final, 2 jogos).
- **Pontuação acumulada** (pontos corridos): a classificação geral é o somatório de todas as rodadas já disputadas.
- **Jogos por fase:** 16-avos = 16 · oitavas = 8 · quartas = 4 · semifinais = 2 · rodada final = 2 — **total de 32 jogos**.
- **Fora do escopo:** a fase de grupos.

## 7. Atores

- **Organizador (único usuário):** faz login; gerencia participantes, indicações e pagamentos; monta rodadas; registra palpites e resultados; exporta tudo para o WhatsApp.
- **Participantes (externos):** dão palpites e acompanham pelo grupo. No sistema, são um registro com nome, apelido, indicação, palpites, pontos, valor a pagar e status de pagamento.

## 8. Regras de negócio

### 8.1 Base da pontuação
Os palpites valem **somente para o tempo normal (90 minutos)**. Prorrogação e pênaltis **não contam**, mesmo no mata-mata. Consequência: o **empate é um palpite válido**, ainda que o confronto real seja decidido depois.

### 8.2 Critério de pontos
- **Placar exato** → **3 pontos**
- **Resultado certo** (acertou o vencedor OU o empate), mas placar errado → **1 ponto**
- **Resultado errado** → **0 pontos**

### 8.3 Exemplos de pontuação
**Resultado real 2 x 1:**
`2x1 → 3` · `3x1 → 1` · `1x0 → 1` · `1x1 → 0` · `0x1 → 0`

**Resultado real 1 x 1:**
`1x1 → 3` · `2x2 → 1` · `2x1 → 0`

### 8.4 Palpites ausentes
Participante que não enviar palpite para um jogo recebe **0 ponto naquele jogo** (não há penalidade extra; apenas não pontua).

### 8.5 Desempate da classificação
Com a mesma pontuação total, ordenar por:
1. Maior **número de placares exatos** (palpites de 3 pontos);
2. Maior **número de resultados certos** (palpites de 1 ponto ou mais);
3. Persistindo o empate (raríssimo): **mesma posição**, com ordem manual opcional definida pelo organizador.

### 8.6 Correções
O organizador pode **editar palpites e corrigir resultados a qualquer momento** — **não há trava** (ele é o único operador). Qualquer correção **recalcula automaticamente** a pontuação da rodada e a classificação geral.

### 8.7 Valor a pagar e regra de indicação
- **Valor base do bolão:** **R$ 40** por participante.
- **Desconto por indicação:** cada pessoa indicada que **entra** (é cadastrada) dá **R$ 5 de desconto ao indicador** — **mesmo que o indicado ainda não tenha pago**.
- **Piso:** todo participante paga **no mínimo R$ 5**. O desconto máximo efetivo é R$ 35 (atingido com 7 indicados).
- **Apenas indicação direta:** o desconto é de quem indicou diretamente. Exemplo: Diego indica João → Diego paga R$ 35. João depois indica outros 3 → **Diego continua em R$ 35**; o benefício dos 3 é só do João.
- **Fórmula:**
  `valor a pagar = máximo( 5 ; 40 − 5 × (nº de indicados diretos que entraram) )`
- **Registro da indicação:** no cadastro de um participante, o campo "indicado por" é **opcional** e preenchido **selecionando um participante já existente** (não se digita). Como só se indica quem já está na lista, a indicação sempre aponta para alguém cadastrado antes.

| Indicados diretos | Valor a pagar |
|---|---|
| 0 | R$ 40 |
| 1 | R$ 35 |
| 2 | R$ 30 |
| 3 | R$ 25 |
| 4 | R$ 20 |
| 5 | R$ 15 |
| 6 | R$ 10 |
| 7 ou mais | R$ 5 (piso) |

### 8.8 Status de pagamento e totais
- Status manual por participante: **Pago** ou **Pendente** (padrão **Pendente** ao cadastrar).
- O status é **apenas informativo**: **não afeta pontuação nem classificação**.
- O sistema mantém, no agregado:
  - **Total esperado** = soma dos valores a pagar de todos os participantes;
  - **Total recebido** = soma dos valores a pagar dos que estão "Pago";
  - **Falta receber** = total esperado − total recebido.

## 9. Funcionalidades principais

**Participantes e pagamentos**
1. **Gerenciar participantes** — cadastrar/editar **nome**, **apelido** (opcional, para diferenciar homônimos), **indicado por** (opcional, selecionando um participante existente) e **status de pagamento**. A lista é **travada quando o bolão começa** (ninguém entra no meio).
2. **Buscar/filtrar/ordenar participantes** — localizar por nome/apelido, filtrar (ex.: só pendentes) e ordenar (por nome, por valor, por pontuação).
3. **Perfil do participante** — visão individual consolidada (ver tela 12.4).
4. **Controle de pagamentos** — todos com status e valor, mais os **totais** (esperado, recebido, falta). Com filtro e ordenação.

**Rodadas, palpites e resultados**
5. **Catálogo de seleções** — seleções pré-cadastradas (nome + bandeira), selecionadas ao montar rodadas (sem digitação).
6. **Montar rodada** — selecionar as seleções par a par (esquerda × direita) por jogo; gera a mensagem da rodada.
7. **Registrar palpites** — tela **por participante**, listando os jogos da rodada para preenchimento rápido.
8. **Acompanhar quem já palpitou** — por rodada, ver quem já enviou e **quem ainda falta** (e exportar a cobrança).
9. **Registrar resultados** — placar real (90 min) por jogo, conforme acontecem.
10. **Calcular/atualizar pontuação** — recálculo automático da rodada e do acumulado a cada resultado.

**Organização e saída**
11. **Painel de visão geral** — resumo do estado do bolão num relance (pagamentos, pote, status da rodada atual).
12. **Exportar para o WhatsApp** — *qualquer* lista/visão vira texto formatado copiável (ver seção 11).
13. **Ciclo de vida da rodada** — estados que orientam o organizador (ver 10).

## 10. Ciclo de vida da rodada

Cada rodada passa por quatro estados, em sequência. O estado é um **guia** (não uma trava — correções são sempre livres):

1. **Montada** — a rodada foi criada e os confrontos (jogos) definidos a partir do catálogo. Ainda dá para ajustar os confrontos. A "mensagem da rodada" pode ser gerada e enviada ao grupo.
2. **Palpites abertos** — o organizador está coletando no grupo e **registrando os palpites** no sistema. Aqui se acompanha "quem ainda falta palpitar".
3. **Resultados em andamento** — os jogos começaram; o organizador **registra os placares** conforme terminam, e a pontuação vai sendo calculada. Gera "resumo do jogo" a cada resultado.
4. **Encerrada** — todos os resultados lançados; a rodada é fechada e gera o "resumo da rodada". A classificação geral reflete o acumulado.

## 11. Telas do sistema (mapa de navegação detalhado)

**Regra geral:** toda tela que exibe uma lista oferece **exportar para o WhatsApp**.

**11.1 Login**
Acesso do organizador (identificação pessoal). Nenhum participante acessa.

**11.2 Painel de visão geral (tela inicial)**
Resumo do bolão num relance:
- **Pagamentos:** quantos pagaram de quantos (ex.: 40/63), total recebido vs. esperado e quanto falta.
- **Rodada atual:** qual é, em que estado está e **quantos já palpitaram** (ex.: 51/63).
- Atalhos para as telas principais.

**11.3 Participantes**
- Lista de todos os participantes com **busca, filtro e ordenação**.
- Cada item mostra, de forma clara, o essencial (nome/apelido, quem indicou, status, valor).
- Ação de **cadastrar/editar** (nome, apelido, indicado por, status).
- Clicar num participante abre o **perfil** (11.4).
- Exportável (lista de participantes).

**11.4 Perfil do participante** ("o perfil do bolão")
Visão individual consolidada de uma pessoa:
- **Indicações:** quem o indicou e a lista de quem **ele** indicou.
- **Pagamento:** valor a pagar (com o desconto aplicado) e status.
- **Desempenho:** total de **placares exatos**, **pontos por rodada** e **pontuação/posição** acumulada.
- Serve para o organizador responder rápido quando alguém pergunta "como eu estou?".

**11.5 Pagamentos**
- Lista de todos com **status** (Pago/Pendente) e **valor a pagar**, com filtro (ex.: só pendentes) e ordenação.
- **Totais:** esperado, recebido e falta.
- Exportável (lista de pagamentos: pagos e devedores).

**11.6 Rodadas**
- As 5 rodadas com seus **estados** (montada → palpites abertos → resultados em andamento → encerrada).
- Ação **montar rodada** (seleção par a par do catálogo).

**11.7 Rodada (detalhe)**
Centraliza a operação de uma rodada:
- **Jogos** da rodada (seleções e ordem).
- **Registrar palpites** (por participante) e ver **quem ainda falta**.
- **Registrar resultados** (placar 90 min por jogo).
- **Pontuação** da rodada calculada.
- **Artefatos da rodada:** mensagem da rodada, tabela de palpites, resumo do jogo, resumo da rodada, pendências de palpite.

**11.8 Catálogo de seleções**
Seleções pré-carregadas (nome + bandeira) usadas na montagem. Conteúdo majoritariamente fixo (dado de referência).

## 12. Artefatos e exportação para WhatsApp

**Princípio central:** *tudo que o organizador vê pode virar um texto formatado pra colar no grupo.* **Cópia/exportação fácil é a prioridade número um.**

**Formatação (importante):** o WhatsApp **não renderiza tabelas**. Suporta `*negrito*`, `_itálico_`, monoespaçado (entre crases triplas), quebras de linha e **emojis** (incluindo bandeiras 🇧🇷). Os artefatos devem usar **alinhamento por monoespaçado e/ou estruturação por emojis** em vez de tabelas, para ficarem legíveis no celular.

> Os exemplos abaixo são **ilustrativos** — o texto e os emojis exatos podem ser refinados no desenvolvimento. O que importa é a estrutura e a informação contida.

**12.1 Mensagem da rodada (molde)**
```
🏆 *BOLÃO COPA 2026 — OITAVAS DE FINAL*

Mandem os palpites (placar dos 90 min) 👇

1️⃣ 🇧🇷 Brasil  x  Argentina 🇦🇷
2️⃣ 🇫🇷 França   x  Espanha 🇪🇸
3️⃣ 🇵🇹 Portugal x  Alemanha 🇩🇪
4️⃣ 🇳🇱 Holanda  x  Croácia 🇭🇷
```

**12.2 Tabela de palpites**
```
📋 *PALPITES — OITAVAS*

*Diego*  J1 2x1 | J2 0x0 | J3 1x2 | J4 3x1
*Lucas*  J1 1x1 | J2 2x0 | J3 1x1 | J4 2x2
*Ana*    J1 0x0 | J2 1x1 | J3 2x2 | J4 1x0
```

**12.3 Resumo do jogo** (após cada resultado)
```
✅ *RESULTADO — Jogo 1*
🇧🇷 Brasil  2 x 1  Argentina 🇦🇷

🎯 Diego  2x1  → *3 pts* (cravou!)
✔️ Lucas  1x0  → 1 pt
❌ Ana    1x1  → 0 pt
```

**12.4 Resumo da rodada** (ao encerrar)
```
🏁 *FIM DAS OITAVAS*

Pontos na rodada:
🥇 Diego — 8 pts  🔥 destaque da rodada
🥈 Lucas — 5 pts
🥉 Ana   — 3 pts
```

**12.5 Classificação geral**
```
📊 *CLASSIFICAÇÃO GERAL* (após as Oitavas)

1º  Diego — 21 pts
2º  Lucas — 18 pts
3º  Ana   — 15 pts
```

**12.6 Lista de participantes**
```
👥 *PARTICIPANTES (63)*
Diego, Lucas, Ana, João, Pedro, ...
```

**12.7 Pagamentos**
```
💰 *PAGAMENTOS*

✅ Pagos: Diego (R$35), Lucas (R$40), ...
⏳ Pendentes: Ana (R$40), João (R$30), ...

Esperado: R$ 2.300 | Recebido: R$ 1.450 | Falta: R$ 850
```

**12.8 Pendências de palpite da rodada**
```
⚠️ *FALTAM PALPITES — OITAVAS*
Ainda não enviaram: Ana, João, Pedro
Mandem antes do início dos jogos! ⏰
```

## 13. Modelo conceitual (entidades) — visão não técnica

Atributos e relacionamentos no nível de domínio (a modelagem física — tipos, chaves, índices — fica no documento técnico). É importante separar o que é **armazenado** do que é **derivado** (calculado na hora): dados derivados **não se guardam**, para evitar inconsistência quando algo muda.

**Seleção (catálogo)** — *armazenado*
- nome (ex.: "Brasil")
- bandeira (emoji)

**Participante** — *armazenado*
- identidade própria (gerada pelo sistema)
- nome
- apelido (opcional — diferencia homônimos)
- indicador (opcional — referência a **outro Participante**; relação **auto-referente**)
- status de pagamento (Pago / Pendente)

**Rodada** — *armazenado*
- fase (16-avos, oitavas, quartas, semifinais, rodada final)
- ordem/sequência
- estado (montada / palpites abertos / resultados em andamento / encerrada)
- contém vários **Jogos**

**Jogo** — *armazenado*
- rodada à qual pertence
- seleção da esquerda e seleção da direita (**posicionais** — a ordem só importa para o placar, 2x1 ≠ 1x2; **não** representa mando de campo real)
- ordem na rodada (J1, J2, …)
- placar real (90 min), quando disponível

**Palpite** — *armazenado*
- participante + jogo
- placar palpitado (gols esquerda × gols direita)

**Derivados (calculados, não armazenados):**
- **Pontos de um palpite** (0 / 1 / 3), a partir do cruzamento palpite × resultado.
- **Pontos por rodada** e **pontuação geral** de cada participante.
- **Classificação** (com os critérios de desempate).
- **Placares exatos** por participante.
- **Valor a pagar** do participante = `máximo(5; 40 − 5 × nº de indicados diretos)`.
- **Totais de pagamento** (esperado, recebido, falta).
- **Quem ainda não palpitou** numa rodada.

**Relacionamentos resumidos:**
- Rodada **1—N** Jogo
- Jogo **1—N** Palpite · Participante **1—N** Palpite
- Participante **0..1 — N** Participante (indicação auto-referente: um indicador, vários indicados)
- Jogo **N—2** Seleção (esquerda e direita, vindas do catálogo)

## 14. O que o sistema NÃO faz (fora de escopo)

- **Não tem login/acesso para participantes** — apenas o organizador.
- **Não envia mensagens automaticamente** ao WhatsApp (o organizador copia e cola).
- **Não busca resultados** dos jogos automaticamente (o organizador digita os placares e monta as rodadas seguintes manualmente).
- **Não cobre a fase de grupos.**
- **Não movimenta dinheiro de verdade** (sem transações, gateway ou cobrança automática) e **não calcula premiação**. Ele **calcula e exibe** o valor devido por participante e **registra manualmente** Pago/Pendente, como controle organizacional.
- **Não possui** notificações, chat interno nem funcionalidades de rede social.

## 15. Requisitos não-funcionais

- **Cópia/exportação fácil é a prioridade número um**, válida para todas as listas e visões.
- **Formatação amigável ao WhatsApp** em todas as saídas (negrito, itálico, monoespaçado, emojis, sem tabelas).
- **Interface limpa e confortável** no mobile e no desktop.
- **Clareza com dezenas de participantes:** com ~63 pessoas, as listas têm busca, filtro e ordenação, e deixam evidente quem foi indicado por quem, quem pagou e quanto cada um deve.
- **Aplicação online (deployada)** com **armazenamento central** e **autenticação pessoal do organizador**; dados preservados por semanas e consistentes entre dispositivos.
- **Segurança proporcional ao uso:** usuário único, sem dados sensíveis de terceiros — autenticação básica e proteção razoável bastam. Sem complexidade de multiusuário/escala, mas o projeto deve ser feito com **boas práticas** (aplicação bem construída de ponta a ponta).

## 16. Decisões fechadas (consolidado)

| # | Tema | Decisão |
|---|------|---------|
| 1 | Escopo das rodadas | Todo o mata-mata, dos 16-avos à final (5 rodadas, 32 jogos). |
| 2 | Base da pontuação | Apenas o tempo normal (90 min); empate é palpite válido. |
| 3 | Critério de pontos | Placar exato = 3; resultado certo = 1; errado = 0. |
| 4 | Palpite ausente | 0 ponto no jogo. |
| 5 | Desempate | 1º placares exatos; 2º resultados certos; 3º empate mantido (ajuste manual opcional). |
| 6 | Correções | Sempre livres (sem trava); recálculo automático. |
| 7 | Valor base | R$ 40 por participante. |
| 8 | Desconto por indicação | −R$ 5 por indicado direto que entra; vale mesmo sem o indicado ter pago. |
| 9 | Piso de pagamento | Mínimo R$ 5 (desconto máximo efetivo R$ 35). |
| 10 | Indicação | Apenas direta (sem efeito em cadeia); registrada por seleção de participante existente. |
| 11 | Status de pagamento | Pago/Pendente, informativo; não afeta pontuação. |
| 12 | Totais | Esperado, recebido e falta. |
| 13 | Catálogo de seleções | Pré-carregado (nome + bandeira); usado por seleção. |
| 14 | Montagem da rodada | Manual, selecionando do catálogo (sem digitar). |
| 15 | Posicionamento dos times | Posicional (esquerda × direita); ordem só importa para o placar. |
| 16 | Entrada de palpites | Tela por participante, listando os jogos da rodada. |
| 17 | Lista de participantes | Travada quando o bolão começa; ninguém entra no meio. |
| 18 | Ciclo de vida da rodada | montada → palpites abertos → resultados em andamento → encerrada. |
| 19 | 3º lugar + final | Uma única rodada com 2 jogos. |
| 20 | Acesso | Multi-dispositivo (celular + computador). |
| 21 | Arquitetura (funcional) | Online, com banco central, autenticação do organizador e deploy. |
| 22 | Perfil do participante | Visão individual: indicações, placares exatos, pontos por rodada, valor/status. |
| 23 | Exportação | Tudo que se vê é exportável para o WhatsApp. |
| 24 | Busca/filtro/ordenação | Nas listas de participantes e pagamentos. |
| 25 | Painel de visão geral | Resumo de pagamentos, pote e rodada atual. |
| 26 | Quem ainda não palpitou | Acompanhamento por rodada + exportação da cobrança. |
| 27 | Apelido | Campo opcional no cadastro, para diferenciar homônimos. |

*Não há pontos funcionais em aberto. Documento base fechado.*

## 17. Próximo passo (fora deste documento)

Com o *o quê* fechado, o próximo passo é o **documento técnico/arquitetura**, que tratará do *como*:
- **Modelagem física de dados:** as entidades da seção 13 viram tabelas e relacionamentos (com destaque para a **indicação auto-referente** e para o tratamento dos **campos derivados** — valor a pagar, totais, pontuação, classificação — calculados em vez de armazenados);
- **Stack:** back-end, banco de dados, front-end;
- **Autenticação** do organizador e **estratégia de deploy**.

Este documento de contexto permanece como a **fonte de verdade** do comportamento e das regras do sistema.

---

*Documento de contexto funcional. Não inclui definições de stack, arquitetura técnica ou implementação — apenas o escopo, o comportamento e as regras do sistema.*
