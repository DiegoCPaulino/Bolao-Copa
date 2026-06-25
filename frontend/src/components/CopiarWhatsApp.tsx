import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Botão "Copiar para WhatsApp" — peça de primeira classe (exportar é o requisito nº 1).
 * RECEBE um texto JÁ PRONTO (o text/plain que a API devolve dos formatadores do núcleo)
 * e só o copia via Clipboard API, com feedback. NÃO gera nem formata o texto — isso vive
 * no back-end (CLAUDE.md §3.4). A busca do texto por tela é da Fase 8.
 */
export function CopiarWhatsApp({
  texto,
  rotulo = "Copiar para WhatsApp",
  className,
}: {
  texto: string;
  rotulo?: string;
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={copiar} className={className}>
      {copiado ? "✅ Copiado!" : rotulo}
    </Button>
  );
}
