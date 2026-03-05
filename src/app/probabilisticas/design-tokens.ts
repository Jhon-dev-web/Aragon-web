/**
 * Design system tokens — Aragon Analytics (SaaS premium dark theme).
 * Use com Tailwind: ex. bg-[var(--aa-bg)], rounded-[var(--aa-radius-md)].
 * Cores garantem contraste e legibilidade.
 */
export const tokens = {
  // Backgrounds
  bg: {
    page: "#060B14",
    surface: "#0F172A",
    card: "#111827",
    input: "#0B1220",
    hover: "#1E293B",
  },
  // Borders
  border: {
    default: "#1F2937",
    muted: "#334155",
    focus: "rgba(37, 99, 235, 0.5)",
  },
  // Text
  text: {
    primary: "#F1F5F9",
    secondary: "#94A3B8",
    muted: "#64748B",
  },
  // Brand & states
  primary: "#2563EB",
  primaryHover: "#3B82F6",
  success: "#22C55E",
  successMuted: "#16A34A",
  warning: "#EAB308",
  danger: "#EF4444",
  // Assertividade (thresholds no PairCard)
  assertivity: {
    high: "#16A34A",   // >= 75
    medium: "#22C55E", // 60-74
    low: "#EAB308",    // 50-59
    bad: "#EF4444",    // < 50
  },
  // Radius
  radius: {
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.25rem",
    full: "9999px",
  },
  // Shadows
  shadow: {
    card: "0 1px 3px rgba(0,0,0,0.2)",
    cardHover: "0 4px 12px rgba(0,0,0,0.25), 0 0 20px rgba(37,99,235,0.08)",
  },
} as const;

/** Tailwind class names que espelham os tokens (para uso direto em className). */
export const tw = {
  bgPage: "bg-[#060B14]",
  bgSurface: "bg-[#0F172A]",
  bgCard: "bg-[#111827]",
  bgInput: "bg-[#0B1220]",
  border: "border-[#1F2937]",
  borderMuted: "border-[#334155]",
  textPrimary: "text-[#F1F5F9]",
  textSecondary: "text-[#94A3B8]",
  textMuted: "text-[#64748B]",
  primary: "text-[#2563EB]",
  btnPrimary: "bg-[#2563EB] hover:bg-[#3B82F6] focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]",
  btnSecondary: "bg-[#1E293B] border border-[#334155] text-[#94A3B8] hover:bg-[#334155] hover:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]",
  radiusMd: "rounded-xl",
  radiusLg: "rounded-2xl",
  shadowCard: "shadow-[0_1px_3px_rgba(0,0,0,0.2)]",
  shadowCardHover: "hover:shadow-[0_4px_12px_rgba(0,0,0,0.25)] hover:border-[#2563EB]/40",
} as const;
