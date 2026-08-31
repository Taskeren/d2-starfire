import { Hono } from "hono";
import { accepts } from "hono/accepts";
import { deleteCookie } from "hono/cookie";
import fs from "node:fs";
import selfsigned from "selfsigned";
import { authHono, AuthorizationResponse } from "./components/auth.ts";
import { AuthenticationError } from "./components/bungie.ts";
import d2 from "./routes/d2.ts";
import { Homepage } from "./routes/templates/homepage.tsx";
import logger from "./log.ts";
import auth from "./routes/auth.ts";

const log = logger("main");

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
        if (c.req.header("hx-request")) {
          // if the request is from htmx,
          // ask it to refresh, so the login/logout button is updated.
          c.header("hx-refresh", "true");
          c.status(200);
        } else {
          // default unauthorized path.
          c.status(401);
        }
        return c.text("Authentication Invalid or Expired");
    }
  }

  log.warn("Unhandled exception", e);
  console.error(e);
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
hono.route("/auth", auth);

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
