import { api } from "./client";
import type { Fase } from "./rodadas";

// Camada de API de Participantes — funções tipadas sobre as rotas existentes (6.3a).
// Tudo passa pelo cliente central (credentials + 401 + ApiError herdados). A PÁGINA não
// faz fetch direto. É o molde que as outras telas da Fase 8 copiam.

export type StatusPagamento = "PAGO" | "PENDENTE";

/** Participante como a API devolve (com o indicador resolvido para exibir "indicado por"). */
export type Participante = {
  id: string;
  nome: string;
  apelido: string | null;
  status: StatusPagamento;
  isento: boolean;
  // Override de APRESENTAÇÃO (funcional §8.8): `status` continua sendo a verdade; este
  // boolean só faz o participante aparecer como pago NA EXPORTAÇÃO do WhatsApp.
  exibirComoPago: boolean;
  indicadorId: string | null;
  criadoEm: string;
  indicador: { id: string; nome: string; apelido: string | null } | null;
};

/** Corpo de criação/edição — espelha o `participanteInputSchema` do back (que valida de verdade). */
export type DadosParticipante = {
  nome: string;
  apelido?: string | null;
  indicadorId?: string | null;
  isento?: boolean;
  exibirComoPago?: boolean;
};

/** Filtros server-side que a rota aceita. A tela 8.1 filtra CLIENT-SIDE (ver Participantes.tsx),
 *  mas a função expõe o contrato completo para quem precisar. */
export type OpcoesListagem = {
  busca?: string;
  status?: StatusPagamento;
  ordenarPor?: "nome" | "criadoEm";
};

export function listarParticipantes(opcoes: OpcoesListagem = {}): Promise<Participante[]> {
  const q = new URLSearchParams();
  if (opcoes.busca) q.set("busca", opcoes.busca);
  if (opcoes.status) q.set("status", opcoes.status);
  if (opcoes.ordenarPor) q.set("ordenarPor", opcoes.ordenarPor);
  const qs = q.toString();
  return api.get<Participante[]>(`/participantes${qs ? `?${qs}` : ""}`);
}

export const criarParticipante = (dados: DadosParticipante) =>
  api.post<Participante>("/participantes", dados);

export const editarParticipante = (id: string, dados: DadosParticipante) =>
  api.put<Participante>(`/participantes/${id}`, dados);

export const removerParticipante = (id: string) => api.del<void>(`/participantes/${id}`);

/** GET /participantes/export → text/plain (§12.6). O texto vem PRONTO; o front só copia. */
export const exportarParticipantes = () => api.getTexto("/participantes/export");

/** Referência enxuta a um participante (indicador/indicados no perfil). */
export type RefParticipante = { id: string; nome: string; apelido: string | null };

/**
 * Perfil consolidado (§12.4) — o back JUNTA os 4 blocos e entrega DERIVADO numa chamada.
 * A tela só EXIBE: nunca soma, nunca deriva indicados, nunca calcula posição/pontos.
 */
export type PerfilParticipante = {
  participante: RefParticipante;
  indicacoes: {
    indicador: RefParticipante | null;
    indicados: RefParticipante[];
  };
  pagamento: {
    isento: boolean;
    valorAPagar: number | null; // null quando isento
    status: StatusPagamento; // a VERDADE (status real) — o perfil não maquia
    exibirComoPago: boolean; // sinalizador cru: perfil AVISA (🎭), nunca mostra "pago" puro
  };
  desempenho: {
    pontos: number;
    placaresExatos: number;
    resultadosCertos: number;
    posicao: number;
    totalClassificados: number;
    porRodada: {
      rodadaId: string;
      fase: Fase;
      ordem: number;
      pontos: number;
      placaresExatos: number;
      decidida: boolean; // false = rodada ainda sem resultado (≠ "jogou e zerou")
    }[];
  };
};

export const obterPerfil = (id: string) =>
  api.get<PerfilParticipante>(`/participantes/${id}/perfil`);
