import { Toaster as Sonner } from "sonner";

// Toaster do Sonner para feedback transitório (sucesso/erro de CRUD e exportação).
// Sem next-themes (app Vite): tema claro padrão, com richColors.
export function Toaster() {
  return <Sonner richColors position="top-center" />;
}
