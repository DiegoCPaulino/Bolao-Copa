import { ChevronLeft, Pencil, VenetianMask } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "@/api/client";
import { obterPerfil } from "@/api/participantes";
import type { PerfilParticipante, RefParticipante } from "@/api/participantes";
import { FASE_LABEL } from "@/components/rodada/labels";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { reais } from "@/lib/formato";
import { cn } from "@/lib/utils";

/** Rótulo: nome + apelido entre aspas, se houver. */
function rotulo(p: { nome: string; apelido: string | null }): string {
  return p.apelido ? `${p.nome} "${p.apelido}"` : p.nome;
}

/** Pluralização pt-BR simples para o split por rodada (ex.: "1 empate" / "2 empates"). */
function plural(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** Link para o perfil de outro participante — a rede de indicações é navegável. */
function LinkParticipante({ p }: { p: RefParticipante }) {
  return (
    <Link to={`/participantes/${p.id}`} className="text-primary underline-offset-2 hover:underline">
      {rotulo(p)}
    </Link>
  );
}

/**
 * Perfil do participante (§12.4) — a visão individual consolidada. Consome UMA chamada
 * (`GET /participantes/:id/perfil`): o back já JUNTOU os 4 blocos derivados. A tela SÓ
 * exibe (CLAUDE.md §3.1): nunca soma, nunca deriva indicados, nunca calcula posição/pontos.
 * É a VERDADE (visão interna) — mostra o status REAL, sem maquiar (§8.8).
 */
export function Perfil() {
  const { id = "" } = useParams<{ id: string }>();
  const [perfil, setPerfil] = useState<PerfilParticipante | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErro(null);
    obterPerfil(id)
      .then((p) => vivo && setPerfil(p))
      .catch((e) => {
        if (vivo) setErro(e instanceof ApiError ? e.message : "Falha ao carregar o perfil.");
      })
      .finally(() => {
        if (vivo) setCarregando(false);
      });
    return () => {
      vivo = false;
    };
  }, [id]);

  if (carregando) return <p className="text-muted-foreground">Carregando…</p>;
  if (erro || !perfil) {
    return (
      <div className="flex flex-col gap-3">
        <Link to="/participantes" className="text-sm text-muted-foreground underline">
          ← Participantes
        </Link>
        <p className="text-destructive">{erro ?? "Participante não encontrado."}</p>
      </div>
    );
  }

  const { participante, indicacoes, pagamento, desempenho } = perfil;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          to="/participantes"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Participantes
        </Link>
        <h1 className="text-2xl font-bold uppercase tracking-wide">
          {participante.nome}
          {participante.apelido && (
            <span className="ml-2 text-lg font-normal normal-case text-muted-foreground">
              "{participante.apelido}"
            </span>
          )}
        </h1>
      </div>

      {/* INDICAÇÕES — a rede é navegável (nomes são links para o perfil de cada um). */}
      <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Indicações</h2>
        <p className="text-sm">
          <span className="text-muted-foreground">Indicado por:</span>{" "}
          {indicacoes.indicador ? <LinkParticipante p={indicacoes.indicador} /> : "—"}
        </p>
        <p className="text-sm">
          <span className="text-muted-foreground">Indicou:</span>{" "}
          {indicacoes.indicados.length === 0 ? (
            <span className="text-muted-foreground">ninguém</span>
          ) : (
            indicacoes.indicados.map((ind, i) => (
              <span key={ind.id}>
                {i > 0 && ", "}
                <LinkParticipante p={ind} />
              </span>
            ))
          )}
        </p>
      </div>

      {/* PAGAMENTO — a VERDADE (status real). Isento → sem R$; exibirComoPago → 🎭 (visão interna). */}
      <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Pagamento</h2>
        {pagamento.isento ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <StatusBadge status="ISENTO" />
            <span className="text-muted-foreground">isento de pagamento</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <StatusBadge status={pagamento.status} />
            <span className="font-medium tabular-nums">
              {pagamento.valorAPagar !== null ? reais(pagamento.valorAPagar) : "—"}
            </span>
            {pagamento.valorCustomizado !== null && (
              <span
                className="inline-flex items-center gap-0.5 whitespace-nowrap text-xs font-medium text-info"
                title="Valor definido manualmente (ignora a fórmula de base/desconto/piso)"
              >
                <Pencil className="size-3.5" aria-hidden />
                valor manual
              </span>
            )}
            {pagamento.exibirComoPago && pagamento.status !== "PAGO" && (
              <span
                className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-info"
                title="Aparece como pago na exportação do WhatsApp (status real: pendente)"
              >
                <VenetianMask className="size-3.5" aria-hidden />
                exibido como pago
              </span>
            )}
          </div>
        )}
      </div>

      {/* DESEMPENHO — destaque (StatCards) + breakdown por rodada. Tudo vem pronto do back. */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Desempenho</h2>
        {/* "Resultados certos" é subdividido em empates e vitórias acertados (só relatório;
            os pontos não mudam). Não exibimos o total "certos" — seria a soma dos três. */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard titulo="Posição" valor={`${desempenho.posicao}º de ${desempenho.totalClassificados}`} />
          <StatCard titulo="Pontos" valor={String(desempenho.pontos)} tom="success" />
          <StatCard titulo="Placares exatos" valor={String(desempenho.placaresExatos)} />
          <StatCard titulo="Empates certos" valor={String(desempenho.empatesAcertados)} />
          <StatCard titulo="Vitórias certas" valor={String(desempenho.vitoriasAcertadas)} />
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pontos por rodada
          </h3>
          {desempenho.porRodada.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma rodada montada ainda.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {desempenho.porRodada.map((r) => (
                <div
                  key={r.rodadaId}
                  className={cn(
                    "min-w-28 rounded-lg border p-3",
                    r.decidida ? "bg-card shadow-sm" : "border-dashed bg-muted/30",
                  )}
                >
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {FASE_LABEL[r.fase]}
                  </p>
                  {r.decidida ? (
                    <>
                      <p className="font-display text-lg font-bold tabular-nums">{r.pontos} pts</p>
                      {/* Split do "certo" da rodada (só quando houve algum). */}
                      {r.empatesAcertados + r.vitoriasAcertadas > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {plural(r.empatesAcertados, "empate", "empates")} ·{" "}
                          {plural(r.vitoriasAcertadas, "vitória", "vitórias")}
                        </p>
                      )}
                    </>
                  ) : (
                    // decidida:false ≠ "fez 0" — visual muted/tracejado, sem número.
                    <p className="text-sm italic text-muted-foreground">aguardando</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
