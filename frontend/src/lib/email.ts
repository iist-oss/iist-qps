export const normalizeEmail = (s: string) => s.trim().toLowerCase();

export function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export function friendlyAuthError(msg: string): string {
  if (/rate limit|too many|security purposes/i.test(msg)) return "Too many attempts. Please wait a few minutes and try again.";
  if (/database error saving new user/i.test(msg)) return "Only Indian Institute of Space Science and Technology email addresses can sign in.";
  if (/expired|invalid|token/i.test(msg)) return "That code is wrong or has expired. Request a new one.";
  return "Something went wrong. Please try again.";
}
