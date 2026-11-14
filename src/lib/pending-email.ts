// Carries the email from sign-up to the OTP page without putting it in the URL.
const KEY = "sem_pending_gmail";

export function savePendingEmail(gmail: string) {
  try {
    sessionStorage.setItem(KEY, gmail);
  } catch {
    // Storage blocked: the OTP page lets the user type the email instead.
  }
}

export function readPendingEmail(): string {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function clearPendingEmail() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
