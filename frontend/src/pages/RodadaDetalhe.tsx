import { ChevronLeft, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import * as palpitesApi from "@/api/palpites";
import type { Pendente } from "@/api/palpites";
import { listarParticipantes } from "@/api/participantes";
import type { Participante } from "@/api/participantes";
import { detalharRodada } from "@/api/rodadas";
import type { Jogo, RodadaDetalhada } from "@/api/rodadas";
import { Combobox } from "@/components/Combobox";
import { CopiarWhatsApp } from "@/components/CopiarWhatsApp";
import { EstadoBadge, FASE_LABEL } from "@/components/rodada/labels";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Aba = "palpites" | "resultados" | "pontuacao";
type Placar = { golsEsquerda: number; golsDireita: number };
type Rascunho = { gE: string; gD: string };

/** Rótulo: nome + apelido entre aspas, se houver. Aceita Participante e Pendente (só usa nome/apelido). */
function rotuloParticipante(p: { nome: string; apelido: string | null }): string {
  return p.apelido ? `${p.nome} "${p.apelido}"` : p.nome;
}

/** Um rascunho é válido se os dois placares são inteiros >= 0 (o back revalida). */
function rascunhoValido(c: Rascunho | undefined): boolean {
  if (!c || c.gE === "" || c.gD === "") return false;
  const e = Number(c.gE);
  const d = Number(c.gD);
  return Number.isInteger(e) && e >= 0 && Number.isInteger(d) && d >= 0;
}

/**
 * Rodada-detalhe (Fatia 8.4-B) — a CASCA da página com abas; só a aba PALPITES é
 * funcional (Resultados/Pontuação são placeholder da 8.4-C). Só consome a API
 * (CLAUDE.md §3.1): nunca recalcula, nunca formata WhatsApp, nunca aplica regra.
 */
export function RodadaDetalhe() {
  const { id = "" } = useParams<{ id: string }>();

  const [rodada, setRodada] = useState<RodadaDetalhada | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("palpites");

  // Estado da aba Palpites: participante escolhido + o que está salvo (verdade do back)
  // e o rascunho dos inputs. `salvandoId` = jogo cujo Salvar está em voo (Loader visível).
  const [participanteId, setParticipanteId] = useState<string | null>(null);
  const [salvos, setSalvos] = useState<Record<string, Placar>>({});
  const [rascunho, setRascunho] = useState<Record<string, Rascunho>>({});
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [exportTexto, setExportTexto] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErroCarga(null);
    (async () => {
      try {
        const [r, ps] = await Promise.all([detalharRodada(id), listarParticipantes()]);
        if (!vivo) return;
        setRodada(r);
        setParticipantes(ps);
        setPendentes(await palpitesApi.pendentes(id));
      } catch (e) {
        if (vivo) setErroCarga(e instanceof ApiError ? e.message : "Falha ao carregar a rodada.");
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [id]);

  const itensParticipante = useMemo(
    () => participantes.map((p) => ({ id: p.id, rotulo: rotuloParticipante(p) })),
    [participantes],
  );

  async function escolherParticipante(pid: string) {
    setParticipanteId(pid);
    setSalvos({});
    setRascunho({});
    try {
      const ps = await palpitesApi.palpitesDoParticipante(id, pid);
      const sal: Record<string, Placar> = {};
      const rasc: Record<string, Rascunho> = {};
      for (const p of ps) {
        sal[p.jogoId] = { golsEsquerda: p.golsEsquerda, golsDireita: p.golsDireita };
        rasc[p.jogoId] = { gE: String(p.golsEsquerda), gD: String(p.golsDireita) };
      }
      setSalvos(sal);
      setRascunho(rasc);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Falha ao carregar os palpites.");
    }
  }

  // Atualização de um lado do rascunho de um jogo (imutável e legível).
  function setLado(jogoId: string, lado: "gE" | "gD", valor: string) {
    setRascunho((prev) => {
      const atual = prev[jogoId] ?? { gE: "", gD: "" };
      return { ...prev, [jogoId]: { ...atual, [lado]: valor } };
    });
  }

  async function salvar(jogo: Jogo) {
    if (salvandoId) return; // um save por vez (guarda transitória, não trava por estado)
    const c = rascunho[jogo.id];
    if (!rascunhoValido(c)) {
      toast.error("Informe os dois placares (inteiros ≥ 0).");
      return;
    }
    setSalvandoId(jogo.id);
    try {
      const p = await palpitesApi.registrarPalpite(id, participanteId ?? "", jogo.id, Number(c.gE), Number(c.gD));
      setSalvos((prev) => ({
        ...prev,
        [jogo.id]: { golsEsquerda: p.golsEsquerda, golsDireita: p.golsDireita },
      }));
      toast.success(`Palpite do J${jogo.ordem} salvo.`);
      setPendentes(await palpitesApi.pendentes(id)); // binário: quem zerou pode ter saído
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Não foi possível salvar o palpite.");
    } finally {
      setSalvandoId(null);
    }
  }

  async function copiar(qual: "tabela" | "pendencias") {
    try {
      setExportTexto(
        qual === "tabela"
          ? await palpitesApi.exportarTabela(id)
          : await palpitesApi.exportarPendencias(id),
      );
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Falha ao exportar.");
    }
  }

  if (carregando) return <p className="text-muted-foreground">Carregando…</p>;
  if (erroCarga || !rodada) {
    return (
      <div className="flex flex-col gap-3">
        <Link to="/rodadas" className="text-sm text-muted-foreground underline">
          ← Rodadas
        </Link>
        <p className="text-destructive">{erroCarga ?? "Rodada não encontrada."}</p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <Link to="/rodadas" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Rodadas
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold uppercase tracking-wide">{FASE_LABEL[rodada.fase]}</h1>
        <EstadoBadge estado={rodada.estado} />
      </div>

      {/* Abas (dep-free). aria-selected marca a ativa; cada conteúdo é um tabpanel. */}
      <div role="tablist" aria-label="Seções da rodada" className="flex gap-1 border-b">
        {(["palpites", "resultados", "pontuacao"] as const).map((a) => (
          <button
            key={a}
            type="button"
            role="tab"
            aria-selected={aba === a}
            onClick={() => setAba(a)}
            className={
              aba === a
                ? "border-b-2 border-primary px-3 py-2 text-sm font-medium text-primary"
                : "border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            }
          >
            {a === "palpites" ? "Palpites" : a === "resultados" ? "Resultados" : "Pontuação"}
          </button>
        ))}
      </div>

      {aba !== "palpites" && (
        <div role="tabpanel" className="rounded-xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          🚧 Em breve (Fatia 8.4-C): {aba === "resultados" ? "registrar resultados" : "ver pontuação"}.
        </div>
      )}

      {aba === "palpites" && (
        <div role="tabpanel" className="flex flex-col gap-4">
          {/* Exportações (text/plain pronto do back) */}
          <div className="flex flex-wrap gap-2">
            <Button variant="gold" onClick={() => void copiar("tabela")}>
              Copiar tabela de palpites
            </Button>
            <Button variant="gold" onClick={() => void copiar("pendencias")}>
              Copiar pendências
            </Button>
          </div>

          {/* Quem ainda não palpitou — REGRA BINÁRIA (vem pronta do back: só zero palpites) */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Quem ainda não palpitou ({pendentes.length})
            </h2>
            {pendentes.length === 0 ? (
              <p className="mt-1 text-sm text-success">✅ Todos já palpitaram nesta rodada.</p>
            ) : (
              <p className="mt-1 text-sm">{pendentes.map(rotuloParticipante).join(", ")}</p>
            )}
          </div>

          {/* Registrar palpite jogo a jogo, por participante */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Palpites de:</span>
            <Combobox
              itens={itensParticipante}
              value={participanteId}
              onChange={(pid) => void escolherParticipante(pid)}
              placeholder="Escolher participante…"
            />
          </div>

          {participanteId === null ? (
            <p className="text-sm text-muted-foreground">
              Escolha um participante para registrar/editar os palpites jogo a jogo.
            </p>
          ) : rodada.jogos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Esta rodada ainda não tem jogos.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {rodada.jogos.map((j) => {
                const c = rascunho[j.id] ?? { gE: "", gD: "" };
                const salvo = salvos[j.id];
                const semMudanca =
                  salvo !== undefined &&
                  c.gE === String(salvo.golsEsquerda) &&
                  c.gD === String(salvo.golsDireita);
                const emVoo = salvandoId === j.id;
                return (
                  <div key={j.id} className="flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm">
                    <span className="text-sm">
                      <span className="text-muted-foreground">⚽ J{j.ordem}</span>{" "}
                      {j.selecaoEsquerda.bandeira} {j.selecaoEsquerda.nome} ×{" "}
                      {j.selecaoDireita.nome} {j.selecaoDireita.bandeira}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        aria-label={`Gols ${j.selecaoEsquerda.nome}`}
                        className="w-16"
                        value={c.gE}
                        onChange={(e) => setLado(j.id, "gE", e.target.value)}
                      />
                      <span className="text-muted-foreground">×</span>
                      <Input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        aria-label={`Gols ${j.selecaoDireita.nome}`}
                        className="w-16"
                        value={c.gD}
                        onChange={(e) => setLado(j.id, "gD", e.target.value)}
                      />
                      <Button
                        size="sm"
                        onClick={() => void salvar(j)}
                        disabled={!rascunhoValido(c) || semMudanca}
                      >
                        {emVoo ? (
                          <>
                            <Loader2 className="animate-spin" aria-hidden /> Salvando…
                          </>
                        ) : (
                          "Salvar"
                        )}
                      </Button>
                      {semMudanca && !emVoo && (
                        <span className="text-xs font-medium text-success">✓ salvo</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Export (text/plain pronto do back) + Copiar */}
      <Dialog open={exportTexto !== null} onOpenChange={(v) => !v && setExportTexto(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar para o WhatsApp</DialogTitle>
            <DialogDescription>Texto pronto — copie e cole no grupo.</DialogDescription>
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
