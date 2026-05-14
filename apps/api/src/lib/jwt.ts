import { SignJWT, jwtVerify } from "jose";

export type AccessTokenPayload = {
  user_id: string;
  tenant_id: string;
  role: "owner" | "supervisor" | "seamstress";
};

export type RefreshTokenPayload = {
  user_id: string;
  tenant_id: string;
  jti: string;
};

export async function signAccessToken(payload: AccessTokenPayload, secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(key);
}

export async function signRefreshToken(payload: RefreshTokenPayload, secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function verifyToken<T>(token: string, secret: string): Promise<T | null> {
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload as T;
  } catch {
    return null;
  }
}
