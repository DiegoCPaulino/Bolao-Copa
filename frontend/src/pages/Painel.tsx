import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import * as classificacaoApi from "@/api/classificacao";
import type { LinhaClassificacao } from "@/api/classificacao";
import * as painelApi from "@/api/painel";
import type { ResumoGeral } from "@/api/painel";
import { listarRodadas } from "@/api/rodadas";
import type { RodadaResumo } from "@/api/rodadas";
import { CopiarWhatsApp } from "@/components/CopiarWhatsApp";
import { EstadoBadge, FASE_LABEL } from "@/components/rodada/labels";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { reais, rotuloParticipante } from "@/lib/formato";

const ATALHOS = [
  { para: "/participantes", titulo: "Participantes", descricao: "Cadastro, apelidos e indicações" },
  { para: "/pagamentos", titulo: "Pagamentos", descricao: "Status, valores e totais" },
  { para: "/rodadas", titulo: "Rodadas", descricao: "Montar jogos, palpites e resultados" },
];

/**
 * Painel — a HOME/cockpit do organizador (§12.2). Só CONSOME a API (CLAUDE.md §3.1):
 * pagamentos agregados, premiação/ganho (75/25) e rodada atual vêm prontos de GET /painel;
 * o TOP 3 vem de GET /classificacao (já ordenado pela cascata). A tela NUNCA soma, divide
 * o pote, ordena ranking ou monta texto de WhatsApp. É a VISÃO PRIVADA: o ganho do
 * organizador (25%) aparece só aqui, nunca no export do grupo.
 */
export function Painel() {
  const [resumo, setResumo] = useState<ResumoGeral | null>(null);
  const [classificacao, setClassificacao] = useState<LinhaClassificacao[]>([]);
  const [rodadas, setRodadas] = useState<RodadaResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [exportTexto, setExportTexto] = useState<string | null>(null);

  async function recarregar() {
    setCarregando(true);
    setErroCarga(null);
    try {
      const [r, c, rs] = await Promise.all([
        painelApi.obterPainel(),
        classificacaoApi.listarClassificacaoGeral(),
        listarRodadas(),
      ]);
      setResumo(r);
      setClassificacao(c);
      setRodadas(rs);
    } catch (e) {
      setErroCarga(e instanceof ApiError ? e.message : "Falha ao carregar o painel.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void recarregar();
  }, []);

  async function copiarClassificacao() {
    try {
      setExportTexto(await classificacaoApi.exportarClassificacaoGeral());
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Falha ao exportar.");
    }
  }

  if (carregando) return <p className="text-muted-foreground">Carregando…</p>;
  if (erroCarga || !resumo) {
    return (
      <div className="rounded-md border border-destructive/50 p-3 text-sm text-destructive">
        {erroCarga ?? "Não foi possível carregar o painel."}{" "}
        <button type="button" className="underline" onClick={() => void recarregar()}>
          Tentar de novo
        </button>
      </div>
    );
  }

  const { pagamentos, rodadaAtual } = resumo;
  const top3 = classificacao.slice(0, 3);

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold uppercase tracking-wide">Painel</h1>

      {/* Pagamentos num relance — tudo DERIVADO do back (a tela nunca soma). */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Pagamentos</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard titulo="Pagos" valor={`${pagamentos.pagos}/${pagamentos.total}`} />
          <StatCard titulo="Esperado" valor={reais(pagamentos.esperado)} />
          <StatCard titulo="Recebido" valor={reais(pagamentos.recebido)} tom="success" />
          <StatCard titulo="Falta receber" valor={reais(pagamentos.falta)} tom="warning" />
        </div>
      </div>

      {/* Fatia do organizador (75/25) — VISÃO PRIVADA: mostra premiação E o seu ganho. */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Sua fatia do pote
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard titulo="🏆 Premiação (atual)" valor={reais(pagamentos.premiacaoAtual)} tom="success" />
          <StatCard titulo="🏆 Premiação (potencial)" valor={reais(pagamentos.premiacaoPotencial)} />
          <StatCard titulo="💼 Seu ganho (atual)" valor={reais(pagamentos.ganhoAtual)} tom="success" />
          <StatCard titulo="💼 Seu ganho (potencial)" valor={reais(pagamentos.ganhoPotencial)} />
        </div>
        <p className="text-xs text-muted-foreground">
          Premiação = 75% do pote; seu ganho = 25%. Visão privada — o seu ganho nunca aparece no export do grupo.
        </p>
      </div>

      {/* Rodadas: a atual em destaque + um relance de todas. */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Rodadas</h2>
          <Link to="/rodadas" className="text-sm text-muted-foreground hover:text-foreground">
            Ver todas →
          </Link>
        </div>
        {rodadaAtual === null ? (
          <p className="text-sm text-muted-foreground">Nenhuma rodada montada ainda.</p>
        ) : (
          <Link
            to={`/rodadas/${rodadaAtual.id}`}
            className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-display text-lg font-semibold uppercase tracking-wide">
                {FASE_LABEL[rodadaAtual.fase]}
              </span>
              <EstadoBadge estado={rodadaAtual.estado} />
            </div>
            <span className="text-sm text-muted-foreground">
              Palpitaram {rodadaAtual.palpitaram}/{rodadaAtual.totalParticipantes} · {rodadaAtual.jogos} jogo(s)
              <span className="ml-1 inline-flex items-center text-foreground">
                — abrir <ChevronRight className="size-4" />
              </span>
            </span>
          </Link>
        )}
        {rodadas.length > 0 && (
          <div className="flex flex-col divide-y rounded-xl border bg-card shadow-sm">
            {rodadas.map((r) => (
              <Link
                key={r.id}
                to={`/rodadas/${r.id}`}
                className="flex items-center justify-between gap-2 p-3 text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <span className="truncate">
                  {FASE_LABEL[r.fase]}{" "}
                  <span className="text-muted-foreground">— {r._count.jogos} jogo(s)</span>
                </span>
                <EstadoBadge estado={r.estado} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* TOP 3 do ranking GERAL — já ordenado do back; a tela só exibe. */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Classificação geral — TOP 3
          </h2>
          <Button variant="gold" size="sm" onClick={() => void copiarClassificacao()}>
            Copiar classificação geral
          </Button>
        </div>
        {top3.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem pontuação ainda — lance resultados para começar.</p>
        ) : (
          <div className="flex flex-col divide-y rounded-xl border bg-card shadow-sm">
            {top3.map((l, i) => (
              <div key={l.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                <span className="truncate">
                  <span className="mr-2 font-display font-bold tabular-nums text-muted-foreground">
                    {i + 1}º
                  </span>
                  {rotuloParticipante(l)}
                </span>
                <span className="font-medium tabular-nums">{l.pontos} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Atalhos — é a home. */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Atalhos</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {ATALHOS.map((a) => (
            <Link
              key={a.para}
              to={a.para}
              className="flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-sm outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <span className="font-display font-semibold uppercase tracking-wide">{a.titulo}</span>
              <span className="text-sm text-muted-foreground">{a.descricao}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Export (text/plain §13.5 pronto do back) + Copiar — o botão que faltava na web. */}
      <Dialog open={exportTexto !== null} onOpenChange={(v) => !v && setExportTexto(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar para o WhatsApp</DialogTitle>
            <DialogDescription>Classificação geral (§13.5) — copie e cole no grupo.</DialogDescription>
          </DialogHeader>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded bg-muted p-3 text-sm">
            {exportTexto}
          </pre>
          {exportTexto !== null && <CopiarWhatsApp texto={exportTexto} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}
