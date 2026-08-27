import { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { SignJWT, jwtVerify } from "jose";
import { appId, appSecret } from "./main.ts";

export type AuthorizationResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  membership_id: string;
};

export type AuthorizationResponseWithIAT = AuthorizationResponse & {
  iat: number;
};

export type HandleCodeRequest =
  | { grant_type: "authorization_code"; code: string }
  | { grant_type: "refresh_token"; refresh_token: string };

export async function handleCode(
  request: HandleCodeRequest,
): Promise<AuthorizationResponse> {
  const body = new URLSearchParams();
  if (request.grant_type === "authorization_code") {
    body.append("grant_type", "authorization_code");
    body.append("code", request.code);
  } else {
    body.append("grant_type", "refresh_token");
    body.append("refresh_token", request.refresh_token);
  }
  body.append("client_id", appId);
  body.append("client_secret", appSecret);

  const resp = await fetch("https://www.bungie.net/platform/app/oauth/token/", {
    method: "POST",
    body: body.toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!resp.ok) throw new Error("Failed to fetch token: " + resp.statusText);

  const data = (await resp.json()) as AuthorizationResponse;
  return data;
}

const jwtSecret = new TextEncoder().encode("ILoveYouAndYouDontKnowIt");

export const jwtAge = 7 * 24 * 60 * 60; // 7 days in seconds

export function signJwt(data: AuthorizationResponse): Promise<string> {
  return new SignJWT({ ...data })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .setJti(crypto.randomUUID())
    .sign(jwtSecret);
}

export async function verifyJwt(
  header: string,
): Promise<AuthorizationResponseWithIAT | null> {
  if (!header) throw new Error("No authorization string provided");

  try {
    const { payload } = await jwtVerify(header, jwtSecret);
    return payload as AuthorizationResponseWithIAT;
  } catch (_error) {
    return null;
  }
}

export async function writeAuthCookieHono(
  c: Context,
  data: AuthorizationResponse,
) {
  const jwt = await signJwt(data);
  return setCookie(c, "passport", jwt, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: jwtAge,
  });
}

export const authHono = createMiddleware<{
  Variables: { loginAs: AuthorizationResponse | null };
}>(async (c, next) => {
  const passport = getCookie(c, "passport");

  if (passport) {
    const data = await verifyJwt(passport);
    if (!data) {
      console.log("Verify failure: " + passport);
    } else {
      const expiresAt = data.iat + data.expires_in;
      if (expiresAt > Date.now() + 5 * 60 * 1000) {
        // if expires in 5 minutes, refresh the token
        const refreshExpiresAt = data.iat + data.refresh_expires_in;
        // 5 seconds for clock skew
        if (refreshExpiresAt < Date.now() - 5 * 1000) {
          // there's no way to refresh the token, so we need to log the user out
          deleteCookie(c, "passport");
          // we can just return here, since the user is logged out and we don't need to do anything else
          return next();
          // NOTE: the login information is not guaranteed, so the controller need to verify themselves.
        }

        // refresh authorization information
        const newAuth = await handleCode({
          grant_type: "refresh_token",
          refresh_token: data.refresh_token,
        });
        await writeAuthCookieHono(c, newAuth);
        c.set("loginAs", newAuth);
      } else {
        c.set("loginAs", data);
      }
    }
  }

  await next();
});
