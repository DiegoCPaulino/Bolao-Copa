import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Selecao } from "@/api/selecoes";
import { SelecaoLabel } from "@/components/Confronto";
import { cn } from "@/lib/utils";

/**
 * Combobox de seleção com BUSCA, dep-free (sem cmdk/Popover): um botão que abre um painel
 * INLINE com Input de filtro + lista rolável de botões (digita "ale" → Alemanha). Fecha
 * com Escape, clique-fora ou ao escolher. Inline de propósito — robusto dentro do Sheet no
 * mobile (sem o atrito de Popover aninhado em Dialog). Usa os tokens centrais (Input/hover).
 */
export function ComboboxSelecao({
  selecoes,
  value,
  onChange,
  excluirId,
  placeholder = "Escolher seleção…",
}: {
  selecoes: Selecao[];
  value: string | null;
  onChange: (id: string) => void;
  /** Id a ocultar da lista (ex.: o time já escolhido do outro lado) — conveniência, não trava. */
  excluirId?: string | null;
  placeholder?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const escolhida = selecoes.find((s) => s.id === value) ?? null;

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return selecoes.filter(
      (s) => s.id !== excluirId && (termo === "" || s.nome.toLowerCase().includes(termo)),
    );
  }, [selecoes, busca, excluirId]);

  // Fecha ao clicar fora do componente.
  useEffect(() => {
    if (!aberto) return;
    function aoClicar(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicar);
    return () => document.removeEventListener("mousedown", aoClicar);
  }, [aberto]);

  function escolher(id: string) {
    onChange(id);
    setAberto(false);
    setBusca("");
  }

  return (
    // Escape em qualquer parte do componente fecha o painel (não depende de onde está o foco).
    <div
      ref={wrapperRef}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape") setAberto(false);
      }}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <span className={cn("truncate", !escolhida && "text-muted-foreground")}>
          {escolhida ? <SelecaoLabel selecao={escolhida} /> : placeholder}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
      </button>

      {aberto && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {/* biome-ignore lint/a11y/noAutofocus: foco no campo de busca ao abrir é o esperado num combobox */}
          <input
            autoFocus
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar…"
            className="mb-1 h-8 w-full rounded-sm border border-input bg-background px-2 text-sm outline-none focus-visible:ring-[2px] focus-visible:ring-ring/50"
          />
          <div className="max-h-56 overflow-y-auto">
            {visiveis.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">Nenhuma seleção.</p>
            ) : (
              visiveis.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => escolher(s.id)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <SelecaoLabel selecao={s} className="flex-1 truncate" />
                  {s.id === value && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
