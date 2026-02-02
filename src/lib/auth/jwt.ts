import { SignJWT, jwtVerify, JWTPayload } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-chars-here'
);

const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '7d';

export interface TokenPayload extends JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user';
}

function parseExpiration(exp: string): string {
  return exp;
}

export async function createSessionToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(parseExpiration(JWT_EXPIRATION))
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as TokenPayload;
  } catch {
    return null;
  }
}
