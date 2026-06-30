import { api } from "./client";

// Camada de API de Palpites (Rodada-detalhe 8.4) — só endpoints já provados na 8.4-A.
// A tela só consome: registra/lê palpite e quem-falta; nunca recalcula nem formata.

export type Palpite = {
  id: string;
  participanteId: string;
  jogoId: string;
  golsEsquerda: number;
  golsDireita: number;
};

/** Quem ainda NÃO palpitou (regra BINÁRIA no back: só zero palpites; parcial não entra). */
export type Pendente = { id: string; nome: string; apelido: string | null };

/** Palpites já registrados de um participante na rodada (para pré-preencher). */
export const palpitesDoParticipante = (rodadaId: string, participanteId: string) =>
  api.get<Palpite[]>(`/participantes/${participanteId}/rodadas/${rodadaId}/palpites`);

/** Registra UM palpite (incremental, upsert; 200). Corpo só o placar; ids na URL. */
export const registrarPalpite = (
  rodadaId: string,
  participanteId: string,
  jogoId: string,
  golsEsquerda: number,
  golsDireita: number,
) =>
  api.put<Palpite>(
    `/participantes/${participanteId}/rodadas/${rodadaId}/jogos/${jogoId}/palpite`,
    { golsEsquerda, golsDireita },
  );

export const pendentes = (rodadaId: string) => api.get<Pendente[]>(`/rodadas/${rodadaId}/pendentes`);

/** Exports (text/plain) PRONTOS do back — o front só copia (§13.8 lista / §13.2 por jogo). */
export const exportarPendencias = (rodadaId: string) =>
  api.getTexto(`/rodadas/${rodadaId}/export/pendencias`);
export const exportarTabela = (rodadaId: string) =>
  api.getTexto(`/rodadas/${rodadaId}/export/tabela`);
