import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/utils/validation';
import { isEmailAllowed } from '@/lib/auth/access-control';
import { generateOTP, storeOTP } from '@/lib/auth/otp';
import { sendOTPEmail } from '@/lib/email/resend';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = loginSchema.parse(body);

    // Check access control
    const allowed = await isEmailAllowed(email);
    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message: 'Ten adres email nie ma dostępu do systemu',
        },
        { status: 403 }
      );
    }

    // Generate 6-digit OTP code
    const code = generateOTP();
    storeOTP(email, code);

    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      console.log('[LOGIN OTP]', email, '→ kod:', code);
    }

    // Send email with code
    const result = await sendOTPEmail(email, code);

    if (!result.success) {
      const fallback =
        isDev || process.env.OTP_ACCEPT_ON_SEND_FAILURE === 'true';
      if (fallback) {
        console.log('[LOGIN OTP]', email, '→ kod:', code);
        console.warn(
          '[LOGIN] Wysyłka maila nie powiodła się – kod w konsoli powyżej. Użyj go do logowania.'
        );
        return NextResponse.json({
          success: true,
          message: 'Kod weryfikacyjny został wysłany na podany adres email',
        });
      }
      console.error('Failed to send OTP:', result.error);
      return NextResponse.json(
        {
          success: false,
          message:
            result.error || 'Nie udało się wysłać emaila. Spróbuj ponownie.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Kod weryfikacyjny został wysłany na podany adres email',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Nieprawidłowe dane' },
      { status: 400 }
    );
  }
}
