/**
 * Erros de DOMÍNIO tipados — CLAUDE.md §8.6 ("erros são de domínio, tratados no
 * adaptador").
 *
 * O serviço lança um destes; o adaptador os traduz: o CLI (Entrega 1) em mensagem
 * clara + código de saída; o HTTP (Entrega 2) em status code. Por isso cada erro
 * carrega:
 *   - `message`: texto pronto para o operador ler;
 *   - `codigo`: discriminante estável (não muda com o texto) que o HTTP mapeará
 *     para um status — independente do idioma da mensagem.
 *
 * Distinguir um erro de regra (esperado, ex.: nome vazio) de um bug (inesperado)
 * é o que permite ao adaptador mostrar uma mensagem amigável em vez de um stack
 * trace: ele trata `ErroDeDominio` e deixa o resto vazar.
 */
export abstract class ErroDeDominio extends Error {
  abstract readonly codigo: string;

  constructor(mensagem: string) {
    super(mensagem);
    // Mantém `instanceof ErroDeDominio` funcionando ao estender Error (TS/ES).
    this.name = new.target.name;
  }
}

/** Nome do participante ausente ou só com espaços — invariante de `Participante`. */
export class NomeObrigatorio extends ErroDeDominio {
  readonly codigo = "NOME_OBRIGATORIO";

  constructor() {
    super("O nome do participante é obrigatório.");
  }
}

/** Operação referenciou um participante (por id) que não existe. */
export class ParticipanteNaoEncontrado extends ErroDeDominio {
  readonly codigo = "PARTICIPANTE_NAO_ENCONTRADO";

  constructor(public readonly id: string) {
    super(`Participante não encontrado (id: ${id}).`);
  }
}

/** O "indicado por" apontou para um participante que não está cadastrado. */
export class IndicadorNaoEncontrado extends ErroDeDominio {
  readonly codigo = "INDICADOR_NAO_ENCONTRADO";

  constructor(public readonly id: string) {
    super(`O indicador selecionado não existe (id: ${id}).`);
  }
}

/** Indicação sem sentido lógico (ex.: participante indicando a si mesmo). */
export class IndicacaoInvalida extends ErroDeDominio {
  readonly codigo = "INDICACAO_INVALIDA";
}

/** Operação referenciou uma rodada (por id) que não existe. */
export class RodadaNaoEncontrada extends ErroDeDominio {
  readonly codigo = "RODADA_NAO_ENCONTRADA";

  constructor(public readonly id: string) {
    super(`Rodada não encontrada (id: ${id}).`);
  }
}

/** Um jogo referenciou uma seleção que não está no catálogo. */
export class SelecaoInvalida extends ErroDeDominio {
  readonly codigo = "SELECAO_INVALIDA";

  constructor(public readonly id: string) {
    super(`A seleção selecionada não existe no catálogo (id: ${id}).`);
  }
}

/** Jogo malformado (ex.: mesma seleção nos dois lados; rodada sem jogos). */
export class JogoInvalido extends ErroDeDominio {
  readonly codigo = "JOGO_INVALIDO";
}

/** Palpite referenciou um jogo que não pertence à rodada informada. */
export class JogoForaDaRodada extends ErroDeDominio {
  readonly codigo = "JOGO_FORA_DA_RODADA";

  constructor(
    public readonly jogoId: string,
    public readonly rodadaId: string,
  ) {
    super(`O jogo ${jogoId} não pertence à rodada ${rodadaId}.`);
  }
}

/** Placar de palpite inválido (gols devem ser inteiros >= 0). */
export class PalpiteInvalido extends ErroDeDominio {
  readonly codigo = "PALPITE_INVALIDO";
}

/** Operação referenciou um jogo (por id) que não existe. */
export class JogoNaoEncontrado extends ErroDeDominio {
  readonly codigo = "JOGO_NAO_ENCONTRADO";

  constructor(public readonly id: string) {
    super(`Jogo não encontrado (id: ${id}).`);
  }
}

/** Tentou remover um jogo que já tem palpites — palpite é dado real (não se apaga em
 *  cascata). O operador deve remover/zerar os palpites antes de excluir o jogo. */
export class JogoComPalpites extends ErroDeDominio {
  readonly codigo = "JOGO_COM_PALPITES";

  constructor(public readonly id: string) {
    super(`O jogo ${id} já tem palpites; remova ou zere os palpites antes de excluí-lo.`);
  }
}

/** Tentou remover um participante que já tem palpites — palpite é histórico (não se apaga
 *  em cascata; a FK Palpite→Participante é RESTRICT). Espelha `JogoComPalpites`. A indicação
 *  NÃO trava a remoção (FK auto-referente é SET NULL — os indicados só perdem o vínculo). */
export class ParticipanteComPalpites extends ErroDeDominio {
  readonly codigo = "PARTICIPANTE_COM_PALPITES";

  constructor(public readonly id: string) {
    super("Não é possível remover: o participante tem palpites registrados.");
  }
}

/** Placar de resultado real inválido (gols devem ser inteiros >= 0). */
export class ResultadoInvalido extends ErroDeDominio {
  readonly codigo = "RESULTADO_INVALIDO";
}

/** Pediu-se o resumo de um jogo que ainda não teve o resultado registrado. */
export class ResultadoNaoRegistrado extends ErroDeDominio {
  readonly codigo = "RESULTADO_NAO_REGISTRADO";

  constructor(public readonly jogoId: string) {
    super(`O jogo ${jogoId} ainda não tem resultado registrado.`);
  }
}
