import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { getOTPEmailTemplate } from './templates';

const resend = new Resend(process.env.RESEND_API_KEY);

// Nadawca: "Name <email@domain.com>". Dla SMTP używany jest EMAIL_FROM.
function getEmailFrom(): string {
  if (process.env.EMAIL_FROM_USE_RESEND_TEST === 'true') {
    return 'ConceptFab Panorama <onboarding@resend.dev>';
  }
  const raw = (process.env.EMAIL_FROM ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, '');
  if (!raw || raw.toLowerCase().includes('localhost')) {
    return 'ConceptFab Panorama <onboarding@resend.dev>';
  }
  return raw.includes('<') && raw.includes('>')
    ? raw
    : `ConceptFab Panorama <${raw}>`;
}

const RESEND_TEST_RECIPIENT = (process.env.RESEND_TEST_RECIPIENT ?? '')
  .trim()
  .toLowerCase();

function useSMTP(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim());
}

async function sendViaSMTP(
  email: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const host = process.env.SMTP_HOST?.trim();
  const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = getEmailFrom();

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    // Port 587 zwykle używa STARTTLS
    requireTLS: port === 587,
    tls:
      port === 587
        ? { rejectUnauthorized: true, minVersion: 'TLSv1.2' as const }
        : undefined,
  });

  try {
    await transporter.sendMail({
      from,
      to: email,
      subject: 'Kod logowania - Panorama Viewer',
      html: getOTPEmailTemplate(code),
    });
    return { success: true };
  } catch (error) {
    console.error('SMTP send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function sendViaResend(
  email: string,
  code: string
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

  try {
    const { error } = await resend.emails.send({
      from: getEmailFrom(),
      to: email,
      subject: 'Kod logowania - Panorama Viewer',
      html: getOTPEmailTemplate(code),
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Resend send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function sendOTPEmail(
  email: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  if (useSMTP()) {
    return sendViaSMTP(email, code);
  }
  return sendViaResend(email, code);
}
