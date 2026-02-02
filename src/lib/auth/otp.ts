// In-memory OTP store (w produkcji użyj Redis)
// Kody wygasają po 10 minutach

interface OTPEntry {
  code: string;
  email: string;
  expiresAt: number;
  attempts: number;
}

const otpStore = new Map<string, OTPEntry>();
const MAX_ATTEMPTS = 3;
const OTP_EXPIRATION_MS = 10 * 60 * 1000; // 10 minut

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of otpStore.entries()) {
      if (entry.expiresAt < now) {
        otpStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export function generateOTP(): string {
  // Generuj 6-cyfrowy kod
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function storeOTP(email: string, code: string): void {
  const normalizedEmail = email.toLowerCase().trim();
  otpStore.set(normalizedEmail, {
    code,
    email: normalizedEmail,
    expiresAt: Date.now() + OTP_EXPIRATION_MS,
    attempts: 0,
  });
}

export function verifyOTP(email: string, code: string): { valid: boolean; error?: string } {
  const normalizedEmail = email.toLowerCase().trim();
  const entry = otpStore.get(normalizedEmail);

  if (!entry) {
    return { valid: false, error: 'Nie znaleziono kodu. Poproś o nowy kod.' };
  }

  if (entry.expiresAt < Date.now()) {
    otpStore.delete(normalizedEmail);
    return { valid: false, error: 'Kod wygasł. Poproś o nowy kod.' };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(normalizedEmail);
    return { valid: false, error: 'Przekroczono limit prób. Poproś o nowy kod.' };
  }

  if (entry.code !== code) {
    entry.attempts++;
    return { valid: false, error: `Nieprawidłowy kod. Pozostało prób: ${MAX_ATTEMPTS - entry.attempts}` };
  }

  // Kod poprawny - usuń z store
  otpStore.delete(normalizedEmail);
  return { valid: true };
}

export function deleteOTP(email: string): void {
  otpStore.delete(email.toLowerCase().trim());
}
