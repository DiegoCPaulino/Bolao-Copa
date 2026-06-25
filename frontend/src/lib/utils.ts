import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Helper do shadcn/ui: junta classes condicionais (clsx) e resolve conflitos do Tailwind. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
