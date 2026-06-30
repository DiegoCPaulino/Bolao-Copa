import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Item genérico de combobox: um id estável + o rótulo a exibir/buscar. */
export type ItemCombobox = { id: string; rotulo: string };

/**
 * Combobox genérico com BUSCA, dep-free (mesmo padrão do `ComboboxSelecao`, mas para
 * qualquer lista {id, rotulo} — ex.: participantes). Painel INLINE (sem Popover/cmdk):
 * Input de filtro + lista rolável de botões. Fecha com Escape, clique-fora ou ao
 * escolher. Usa os tokens centrais (Input/hover).
 */
export function Combobox({
  itens,
  value,
  onChange,
  placeholder = "Escolher…",
}: {
  itens: ItemCombobox[];
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const escolhido = itens.find((i) => i.id === value) ?? null;

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return termo === "" ? itens : itens.filter((i) => i.rotulo.toLowerCase().includes(termo));
  }, [itens, busca]);

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
        <span className={cn("truncate", !escolhido && "text-muted-foreground")}>
          {escolhido ? escolhido.rotulo : placeholder}
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
              <p className="px-2 py-1.5 text-sm text-muted-foreground">Nada encontrado.</p>
            ) : (
              visiveis.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => escolher(i.id)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <span className="flex-1 truncate">{i.rotulo}</span>
                  {i.id === value && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
