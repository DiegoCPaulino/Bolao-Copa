// Cliente HTTP — a ÚNICA camada que conhece o contrato da API (CLAUDE.md §3.1). Nenhum
// componente faz `fetch` direto: tudo passa por aqui. Sempre com `credentials: "include"`
// para o cookie de sessão (httpOnly) atravessar — o JS NÃO lê o cookie, só o envia.

// Base da API. Default RELATIVO `/api` (same-origin): em produção o mesmo serviço serve
// o front e a API sob /api; em dev o proxy do Vite manda `/api` → :3000 (ver vite.config).
// `VITE_API_URL` só é necessário para apontar a API em OUTRA origem (caso especial).
const API_URL = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/+$/, "");

/** Erro tipado a partir do corpo padronizado do backend: `{ erro: { codigo, mensagem } }`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = "ApiError";
  }
}

// Tratamento de 401 CENTRALIZADO: o app registra um handler (ex.: marcar a sessão como
// encerrada → o wrapper de rota redireciona pro /login). Nenhum componente checa 401.
let handler401: (() => void) | null = null;
export function aoReceber401(handler: () => void): void {
  handler401 = handler;
}

type CorpoErro = { erro?: { codigo?: string; mensagem?: string } };

/** 401 central + erro padronizado → ApiError. Compartilhado por JSON e text/plain. */
async function garantirOk(res: Response): Promise<Response> {
  if (res.status === 401) {
    handler401?.();
  }
  if (!res.ok) {
    const dados = (await res.json().catch(() => ({}))) as CorpoErro;
    throw new ApiError(
      res.status,
      dados.erro?.codigo ?? "ERRO",
      dados.erro?.mensagem ?? `Falha na requisição (${res.status}).`,
    );
  }
  return res;
}

async function request<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  const res = await garantirOk(
    await fetch(`${API_URL}${caminho}`, {
      method: metodo,
      credentials: "include",
      headers: corpo === undefined ? undefined : { "Content-Type": "application/json" },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    }),
  );
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

/** GET de exportação (text/plain): devolve o texto JÁ PRONTO dos formatadores do back. */
async function requestTexto(caminho: string): Promise<string> {
  const res = await garantirOk(
    await fetch(`${API_URL}${caminho}`, { method: "GET", credentials: "include" }),
  );
  return res.text();
}

export const api = {
  get: <T>(caminho: string) => request<T>("GET", caminho),
  post: <T>(caminho: string, corpo?: unknown) => request<T>("POST", caminho, corpo),
  put: <T>(caminho: string, corpo?: unknown) => request<T>("PUT", caminho, corpo),
  del: <T>(caminho: string) => request<T>("DELETE", caminho),
  /** text/plain — para as exportações de WhatsApp (§12.x). */
  getTexto: (caminho: string) => requestTexto(caminho),
};
