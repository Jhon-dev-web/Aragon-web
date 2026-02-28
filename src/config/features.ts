/**
 * Feature flags para exibir ou esconder áreas no frontend.
 * Configure no Render (ou .env.local):
 *   NEXT_PUBLIC_FEATURE_EXECUTOR=true|false
 *   NEXT_PUBLIC_FEATURE_SIGNALS=true|false
 */
export const FEATURES = {
  EXECUTOR: process.env.NEXT_PUBLIC_FEATURE_EXECUTOR === "true",
  SIGNALS: process.env.NEXT_PUBLIC_FEATURE_SIGNALS === "true",
} as const;
