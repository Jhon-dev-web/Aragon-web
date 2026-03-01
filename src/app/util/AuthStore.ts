/**
 * Armazenamento de token e perfil (logout limpo).
 * tokenKey único para evitar conflito com outras apps.
 */

const tokenKey = "aragon_token";
const userEmailKey = "aa_user_email";
const userPlanKey = "aa_user_plan";

const LEGACY_TOKEN_KEY = "aa_auth_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  let t = window.localStorage.getItem(tokenKey);
  if (!t) {
    const legacy = window.localStorage.getItem(LEGACY_TOKEN_KEY);
    if (legacy) {
      window.localStorage.setItem(tokenKey, legacy);
      window.localStorage.removeItem(LEGACY_TOKEN_KEY);
      t = legacy;
    }
  }
  return t;
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(tokenKey, token);
  } else {
    window.localStorage.removeItem(tokenKey);
  }
}

export function clearToken(): void {
  setToken(null);
}

export function clearUserProfile(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(userEmailKey);
}

export function clearPlan(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(userPlanKey);
}

/** Logout completo: token + perfil + plan. */
export function clearAll(): void {
  clearToken();
  clearUserProfile();
  clearPlan();
}

/** Chaves usadas pela API para manter email/plan em sync (leitura). */
export const USER_EMAIL_KEY = userEmailKey;
export const USER_PLAN_KEY = userPlanKey;

export function getStoredUserEmail(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(userEmailKey);
}

export function setStoredUserEmail(email: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(userEmailKey, email.toLowerCase());
}

export function getStoredPlan(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(userPlanKey);
}

export function setStoredPlan(plan: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(userPlanKey, plan);
}
