import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import * as rodadasApi from "@/api/rodadas";
import type { Estado, Fase, Jogo, RodadaDetalhada, RodadaResumo } from "@/api/rodadas";
import { listarSelecoes } from "@/api/selecoes";
import type { Selecao } from "@/api/selecoes";
import { ComboboxSelecao } from "@/components/ComboboxSelecao";
import { CopiarWhatsApp } from "@/components/CopiarWhatsApp";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// Rótulos de apresentação (o domínio é em pt-BR; aqui só formatamos). Ordem dos estados =
// a sequência do ciclo de vida (guia), usada no avançar/retroceder.
const FASES: Fase[] = ["DEZESSEIS_AVOS", "OITAVAS", "QUARTAS", "SEMIFINAIS", "FINAL"];
const FASE_LABEL: Record<Fase, string> = {
  DEZESSEIS_AVOS: "16-avos de final",
  OITAVAS: "Oitavas de final",
  QUARTAS: "Quartas de final",
  SEMIFINAIS: "Semifinais",
  FINAL: "Final (3º + final)",
};
const ESTADOS_ORDEM: Estado[] = ["MONTADA", "PALPITES_ABERTOS", "RESULTADOS_EM_ANDAMENTO", "ENCERRADA"];
const ESTADO_LABEL: Record<Estado, string> = {
  MONTADA: "Montada",
  PALPITES_ABERTOS: "Palpites abertos",
  RESULTADOS_EM_ANDAMENTO: "Resultados em andamento",
  ENCERRADA: "Encerrada",
};

/** Pill de estado da rodada — MESMO vocabulário visual do StatusBadge (tokens centrais),
 *  mas próprio do domínio de rodada. Estado é EXIBIDO; nunca trava a edição de jogos. */
function EstadoBadge({ estado }: { estado: Estado }) {
  const tom: Record<Estado, string> = {
    MONTADA: "bg-muted text-muted-foreground",
    PALPITES_ABERTOS: "bg-info-soft text-info",
    RESULTADOS_EM_ANDAMENTO: "bg-warning-soft text-warning",
    ENCERRADA: "bg-success-soft text-success",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tom[estado],
      )}
    >
      {ESTADO_LABEL[estado]}
    </span>
  );
}

/**
 * Tela de Rodadas (Fatia 8.3-B) — LISTA as rodadas e MONTA os jogos (define os
 * confrontos). Palpites/resultados/pontuação são a 8.4. Só consome a API (CLAUDE.md
 * §3.1): nunca recalcula, nunca monta texto de WhatsApp, nunca aplica regra.
 */
export function Rodadas() {
  const [lista, setLista] = useState<RodadaResumo[]>([]);
  const [selecoes, setSelecoes] = useState<Selecao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);

  const [novaOpen, setNovaOpen] = useState(false);
  const [faseNova, setFaseNova] = useState<Fase>("DEZESSEIS_AVOS");
  const [criando, setCriando] = useState(false);

  const [rodadaAberta, setRodadaAberta] = useState<RodadaDetalhada | null>(null);

  async function recarregar() {
    setCarregando(true);
    setErroCarga(null);
    try {
      setLista(await rodadasApi.listarRodadas());
    } catch (e) {
      setErroCarga(e instanceof ApiError ? e.message : "Falha ao carregar rodadas.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void recarregar();
    void (async () => {
      try {
        setSelecoes(await listarSelecoes());
      } catch {
        // se o catálogo falhar, o combobox mostra "Nenhuma seleção" — não derruba a tela.
      }
    })();
  }, []);

  async function criarNova() {
    setCriando(true);
    try {
      const criada = await rodadasApi.criarRodada(faseNova);
      setNovaOpen(false);
      await recarregar();
      setRodadaAberta(criada); // abre o drawer já na rodada recém-criada (vazia)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Não foi possível criar a rodada.");
    } finally {
      setCriando(false);
    }
  }

  async function abrir(id: string) {
    try {
      setRodadaAberta(await rodadasApi.detalharRodada(id));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Não foi possível abrir a rodada.");
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold uppercase tracking-wide">Rodadas</h1>
        <Button onClick={() => setNovaOpen(true)}>
          <Plus className="size-4" /> Nova rodada
        </Button>
      </div>

      {carregando && <p className="text-muted-foreground">Carregando…</p>}
      {erroCarga && (
        <div className="rounded-md border border-destructive/50 p-3 text-sm text-destructive">
          {erroCarga}{" "}
          <button type="button" className="underline" onClick={() => void recarregar()}>
            Tentar de novo
          </button>
        </div>
      )}

      {!carregando && !erroCarga && lista.length === 0 && (
        <p className="text-muted-foreground">Nenhuma rodada ainda. Crie a primeira em "Nova rodada".</p>
      )}

      {!carregando && !erroCarga && lista.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {lista.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => void abrir(r.id)}
              className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-accent"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-lg font-semibold uppercase tracking-wide">
                  {FASE_LABEL[r.fase]}
                </span>
                <EstadoBadge estado={r.estado} />
              </div>
              <span className="text-sm text-muted-foreground">
                {r._count.jogos} jogo(s) — toque para montar
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Nova rodada — escolhe só a fase; os jogos entram no drawer em seguida. */}
      <Dialog open={novaOpen} onOpenChange={setNovaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova rodada</DialogTitle>
            <DialogDescription>Escolha a fase. Os jogos você monta em seguida.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fase">Fase</Label>
            <Select value={faseNova} onValueChange={(v) => setFaseNova(v as Fase)}>
              <SelectTrigger id="fase">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FASES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {FASE_LABEL[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={criando} onClick={() => void criarNova()}>
              {criando ? "Criando…" : "Criar rodada"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drawer: montar/editar os jogos da rodada. */}
      <Sheet open={rodadaAberta !== null} onOpenChange={(v) => !v && setRodadaAberta(null)}>
        {rodadaAberta && (
          <SheetContent>
            <DrawerRodada
              rodada={rodadaAberta}
              selecoes={selecoes}
              aplicarRodada={setRodadaAberta}
              onListaMudou={() => void recarregar()}
            />
          </SheetContent>
        )}
      </Sheet>
    </section>
  );
}

/**
 * Conteúdo do drawer: monta/edita os jogos da rodada (o `gerenciarJogos` do CLI na web).
 * Cada mutação de jogo usa a RODADA DETALHADA devolvida para re-renderizar na hora (sem
 * refetch). O estado (PUT) volta SEM jogos → fazemos MERGE só do estado.
 */
function DrawerRodada({
  rodada,
  selecoes,
  aplicarRodada,
  onListaMudou,
}: {
  rodada: RodadaDetalhada;
  selecoes: Selecao[];
  aplicarRodada: (r: RodadaDetalhada) => void;
  onListaMudou: () => void;
}) {
  const [novoEsq, setNovoEsq] = useState<string | null>(null);
  const [novoDir, setNovoDir] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editEsq, setEditEsq] = useState<string | null>(null);
  const [editDir, setEditDir] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [textoExport, setTextoExport] = useState<string | null>(null);

  const idxEstado = ESTADOS_ORDEM.indexOf(rodada.estado);

  // Wrapper das mutações: evita duplo-clique (in-flight) e traduz erros em toast. O
  // `ocupado` é guarda transitória — NÃO é trava por estado (a edição segue sempre liberada).
  async function comGuard(fn: () => Promise<void>) {
    if (ocupado) return;
    setOcupado(true);
    try {
      await fn();
    } catch (e) {
      // 409 JogoComPalpites e demais erros de domínio chegam com mensagem pronta do back.
      toast.error(e instanceof ApiError ? e.message : "Algo deu errado.");
    } finally {
      setOcupado(false);
    }
  }

  const mudarEstado = (estado: Estado) =>
    comGuard(async () => {
      const r = await rodadasApi.definirEstado(rodada.id, estado);
      aplicarRodada({ ...rodada, estado: r.estado }); // MERGE: a resposta vem sem `jogos`
      onListaMudou();
    });

  const adicionar = () =>
    comGuard(async () => {
      if (!novoEsq || !novoDir) return;
      aplicarRodada(await rodadasApi.adicionarJogo(rodada.id, novoEsq, novoDir));
      setNovoEsq(null);
      setNovoDir(null);
      onListaMudou();
    });

  const salvarEdicao = (jogoId: string) =>
    comGuard(async () => {
      if (!editEsq || !editDir) return;
      aplicarRodada(await rodadasApi.editarJogo(jogoId, editEsq, editDir));
      setEditandoId(null);
      onListaMudou();
    });

  const remover = (jogoId: string) =>
    comGuard(async () => {
      aplicarRodada(await rodadasApi.removerJogo(jogoId));
      onListaMudou();
    });

  const exportar = () =>
    comGuard(async () => {
      setTextoExport(await rodadasApi.exportarMensagem(rodada.id));
    });

  function iniciarEdicao(j: Jogo) {
    setEditandoId(j.id);
    setEditEsq(j.selecaoEsquerdaId);
    setEditDir(j.selecaoDireitaId);
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="text-2xl font-bold uppercase tracking-wide">
          {FASE_LABEL[rodada.fase]}
        </SheetTitle>
        <SheetDescription>
          Monte os confrontos. Adicionar, editar e remover jogo funcionam em qualquer estado.
        </SheetDescription>
      </SheetHeader>

      {/* Ciclo de vida: estado EXIBIDO + avançar/retroceder (limites só nas pontas). NÃO
          trava a montagem de jogos — é guia, não trava (§3.7). */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={idxEstado <= 0 || ocupado}
          onClick={() => mudarEstado(ESTADOS_ORDEM[idxEstado - 1] as Estado)}
        >
          <ChevronLeft className="size-4" /> Retroceder
        </Button>
        <EstadoBadge estado={rodada.estado} />
        <Button
          variant="outline"
          size="sm"
          disabled={idxEstado >= ESTADOS_ORDEM.length - 1 || ocupado}
          onClick={() => mudarEstado(ESTADOS_ORDEM[idxEstado + 1] as Estado)}
        >
          Avançar <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Jogos atuais */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">Jogos ({rodada.jogos.length})</h3>
        {rodada.jogos.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum jogo ainda — adicione abaixo.</p>
        )}
        {rodada.jogos.map((j) =>
          editandoId === j.id ? (
            <div key={j.id} className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
              <span className="text-xs font-medium text-muted-foreground">Editando J{j.ordem}</span>
              <ComboboxSelecao selecoes={selecoes} value={editEsq} onChange={setEditEsq} excluirId={editDir} />
              <ComboboxSelecao selecoes={selecoes} value={editDir} onChange={setEditDir} excluirId={editEsq} />
              <div className="flex gap-2">
                <Button size="sm" disabled={!editEsq || !editDir || ocupado} onClick={() => salvarEdicao(j.id)}>
                  Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditandoId(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div key={j.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
              <span className="truncate text-sm">
                <span className="text-muted-foreground">J{j.ordem}</span> {j.selecaoEsquerda.bandeira}{" "}
                {j.selecaoEsquerda.nome} × {j.selecaoDireita.nome} {j.selecaoDireita.bandeira}
              </span>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" aria-label={`Editar jogo ${j.ordem}`} onClick={() => iniciarEdicao(j)}>
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remover jogo ${j.ordem}`}
                  disabled={ocupado}
                  onClick={() => remover(j.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ),
        )}
      </div>

      {/* Adicionar jogo: esquerda × direita (o direito filtra ≠ esquerda; sem unicidade
          na rodada — a final repete times). */}
      <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
        <span className="text-sm font-medium">Adicionar jogo</span>
        <ComboboxSelecao
          selecoes={selecoes}
          value={novoEsq}
          onChange={setNovoEsq}
          excluirId={novoDir}
          placeholder="Time da esquerda…"
        />
        <ComboboxSelecao
          selecoes={selecoes}
          value={novoDir}
          onChange={setNovoDir}
          excluirId={novoEsq}
          placeholder="Time da direita…"
        />
        <Button disabled={!novoEsq || !novoDir || ocupado} onClick={adicionar}>
          <Plus className="size-4" /> Adicionar jogo
        </Button>
      </div>

      {/* Exportar a mensagem da rodada (artefato 13.1) — texto pronto do back; só copiar. */}
      <div className="mt-auto flex flex-col gap-2">
        <Button variant="gold" onClick={exportar} disabled={ocupado || rodada.jogos.length === 0}>
          Exportar mensagem
        </Button>
        {textoExport !== null && (
          <div className="flex flex-col gap-2 rounded-lg border bg-muted p-3">
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-sm">{textoExport}</pre>
            <div className="flex gap-2">
              <CopiarWhatsApp texto={textoExport} />
              <Button variant="outline" size="sm" onClick={() => setTextoExport(null)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
