/** Helpers compartilhados pelo dashboard (sem dependência de React). */
export function isOtc(asset: string): boolean {
  return asset.toUpperCase().endsWith("-OTC");
}

export function symbolToLabel(symbol: string): string {
  const base = symbol.replace(/-OTC$/i, "").trim();
  if (base.length === 6 && /^[A-Z]+$/i.test(base)) {
    return `${base.slice(0, 3)}/${base.slice(3)}`;
  }
  return base;
}

/** Cor de assertividade: >=75 verde forte, 60-74 verde médio, 50-59 amarelo, <50 vermelho */
export function assertivityColor(pct: number): { bg: string; text: string; label: string } {
  if (pct >= 75) return { bg: "bg-emerald-900/40", text: "text-emerald-300", label: "Alta" };
  if (pct >= 60) return { bg: "bg-green-900/40", text: "text-green-300", label: "Boa" };
  if (pct >= 50) return { bg: "bg-amber-900/40", text: "text-amber-300", label: "Média" };
  return { bg: "bg-red-900/40", text: "text-red-300", label: "Baixa" };
}

/**
 * Cor dinâmica do número de assertividade (UI dashboard).
 * >= 80: text-green-400 | >= 70: text-green-300 | >= 60: text-yellow-400 | < 60: text-red-400
 */
export function getAssertivenessColor(value: number): string {
  if (value >= 80) return "text-green-400";
  if (value >= 70) return "text-green-300";
  if (value >= 60) return "text-yellow-400";
  return "text-red-400";
}
