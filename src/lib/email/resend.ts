import { Resend } from 'resend';
import { getOTPEmailTemplate } from './templates';

const resend = new Resend(process.env.RESEND_API_KEY);

// Nadawca: "Name <email@domain.com>". Set EMAIL_FROM_USE_RESEND_TEST=true tylko do testów (wysyłka tylko na adres konta Resend).
function getEmailFrom(): string {
  if (process.env.EMAIL_FROM_USE_RESEND_TEST === 'true') {
    return 'ConceptFab Pano <onboarding@resend.dev>';
  }
  const raw = (process.env.EMAIL_FROM ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, '');
  if (!raw || raw.toLowerCase().includes('localhost')) {
    return 'ConceptFab Pano <onboarding@resend.dev>';
  }
  return raw.includes('<') && raw.includes('>')
    ? raw
    : `ConceptFab Pano <${raw}>`;
}

const RESEND_TEST_RECIPIENT = (process.env.RESEND_TEST_RECIPIENT ?? '')
  .trim()
  .toLowerCase();

export async function sendOTPEmail(
  email: string,
  code: string,
  options?: { isAdmin?: boolean }
): Promise<{ success: boolean; error?: string }> {
  const isTestSender = process.env.EMAIL_FROM_USE_RESEND_TEST === 'true';
  const toLower = email.trim().toLowerCase();

  if (
    isTestSender &&
    RESEND_TEST_RECIPIENT &&
    toLower !== RESEND_TEST_RECIPIENT
  ) {
    return {
      success: false,
      error: `W trybie testowym kod można wysłać tylko na adres ${RESEND_TEST_RECIPIENT}. Wpisz ten adres na stronie logowania lub zweryfikuj domenę w Resend (resend.com/domains) i wyłącz EMAIL_FROM_USE_RESEND_TEST w .env.local.`,
    };
  }

  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';
  const subjectBase = `Kod logowania - CONCEPTFAB Pano v: ${appVersion}`;
  const subject = options?.isAdmin ? `[Admin] ${subjectBase}` : subjectBase;

  try {
    const { error } = await resend.emails.send({
      from: getEmailFrom(),
      to: email,
      subject,
      html: getOTPEmailTemplate(code, appVersion, options?.isAdmin),
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
