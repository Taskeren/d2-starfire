import { PlatformErrorCodes } from "bungie-api-ts/destiny2";
import { getBungieNetUserById } from "bungie-api-ts/user";
import { Hono } from "hono";
import { accepts } from "hono/accepts";
import { deleteCookie } from "hono/cookie";
import selfsigned from "selfsigned";
import {
  authHono,
  AuthorizationResponse,
  handleCode,
  writeAuthCookieHono,
} from "./auth.ts";
import { AuthenticationError, bungieClient } from "./bungie.ts";
import d2 from "./d2.ts";
import { Homepage } from "./homepage.tsx";
import fs from "node:fs";
import { UserCard } from "./d2.tsx";

const hono = new Hono<{
  Variables: { loginAs: AuthorizationResponse | null };
}>();

export type HonoSpec = typeof hono;

hono.use(authHono);

hono.onError((e, c) => {
  if (e instanceof AuthenticationError) {
    // handle authentication error
    // this error will only be thrown when calling Bungie API, and it respond with a 401 error,
    // which means the access token is invalid.
    // we must delete it, so that the next request will correctly set the loginAs as null.
    deleteCookie(c, "passport", { path: "/" });
    // respond in their favorite format.
    switch (
      accepts(c, {
        header: "Accept",
        supports: ["application/json", "text/html"],
        default: "application/json",
      })
    ) {
      case "application/json":
        return c.json({ message: "Authentication Invalid or Expired" }, 401);
      case "text/html":
      default:
        return c.text("Authentication Invalid or Expired", 401);
    }
  }

  console.warn("Exception during routing", e);
  return c.text("Internal Server Error", 500);
});

export const appId = Deno.env.get("BG_CLIENT_ID");
export const appSecret = Deno.env.get("BG_CLIENT_SECRET");
export const appToken = Deno.env.get("BG_API_KEY");

hono.get("/", (ctx) => {
  const loginAs = ctx.get("loginAs");

  switch (
    accepts(ctx, {
      header: "Accept",
      supports: ["application/json", "text/html"],
      default: "text/html",
    })
  ) {
    case "application/json":
      return ctx.json({ data: "Hello World! D2Starfire." });
    case "text/html":
    default:
      return ctx.html(Homepage(Boolean(loginAs)));
  }
});

hono.route("/d2", d2);

hono.get("/auth/login", (ctx) => {
  return ctx.redirect(
    `https://www.bungie.net/en/oauth/authorize?client_id=${appId}&response_type=code`,
  );
});

hono.get("/auth/cb", async (ctx) => {
  const code = ctx.req.query("code");

  if (!code) ctx.text("Missing granted code", 401);

  const data = await handleCode({
    grant_type: "authorization_code",
    code: code as string,
  });
  await writeAuthCookieHono(ctx, data);

  switch (
    accepts(ctx, {
      header: "Accept",
      supports: ["application/json", "text/html"],
      default: "text/html",
    })
  ) {
    case "application/json":
      return ctx.json({ data: "OK!" });
    case "text/html":
    default:
      return ctx.redirect("/");
  }
});

hono.get("/auth/logout", (ctx) => {
  deleteCookie(ctx, "passport");
  switch (
    accepts(ctx, {
      header: "Accept",
      supports: ["application/json", "text/html"],
      default: "text/html",
    })
  ) {
    case "application/json":
      return ctx.json({ data: "OK!" });
    case "text/html":
    default:
      return ctx.redirect("/");
  }
});

hono.get("/auth/usercard", async (ctx) => {
  const loginAs = ctx.get("loginAs");
  if (!loginAs) return ctx.text("Invalid authentication", 401);

  const c = bungieClient();
  const id = loginAs.membership_id;

  const resp = await getBungieNetUserById(c, { id });
  if (resp.ErrorCode !== PlatformErrorCodes.Success) {
    return ctx.text("Bungie server failure", 500);
  }

  const u = resp.Response;

  switch (
    accepts(ctx, {
      header: "Accept",
      supports: ["application/json", "text/html"],
      default: "application/json",
    })
  ) {
    case "text/html":
      return ctx.html(UserCard(u));
    case "application/json":
    default:
      return ctx.json({ data: resp.Response });
  }
});

if (import.meta.main) {
  if (Deno.env.get("DENO_DEPLOYMENT_ID")) {
    // in Deno Deploy
    Deno.serve(hono.fetch);
  } else {
    if (!fs.existsSync("key.pem") || !fs.existsSync("cert.pem")) {
      const ss = await selfsigned.generate([
        { name: "commonName", value: "127.0.0.1" },
      ]);
      fs.writeFileSync("key.pem", ss.private);
      fs.writeFileSync("cert.pem", ss.cert);
    }

    Deno.serve(
      {
        port: 8787,
        key: fs.readFileSync("key.pem").toString(),
        cert: fs.readFileSync("cert.pem").toString(),
      },
      hono.fetch,
    );
  }
}
