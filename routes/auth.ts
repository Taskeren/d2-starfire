import { getBungieNetUserById, PlatformErrorCodes } from "bungie-api-ts/user";
import { Hono } from "hono";
import { accepts } from "hono/accepts";
import { deleteCookie } from "hono/cookie";
import { updateAuthByAuthorizationCode } from "../components/auth.ts";
import { bungieClient } from "../components/bungie.ts";
import { appId, HonoSpec } from "../main.ts";
import { UserCard } from "./templates/d2.tsx";
import logger from "../log.ts";

const hono: HonoSpec = new Hono();

export default hono;

const log = logger("authentication");

const MAIN_SITE = "d2.elytra.cn";

type StateData = {
  forwardCallback?: string;
};

function encodeState(data: unknown | undefined): string | undefined {
  if (!data) return undefined;

  const json = JSON.stringify(data);
  return new TextEncoder().encode(json).toBase64();
}

function decodeState<T>(base64: string | undefined): T | undefined {
  // fast-fail
  if (!base64) return undefined;

  const json = new TextDecoder().decode(Uint8Array.fromBase64(base64));
  return JSON.parse(json) as T;
}

function allowCallbackForward(hostname: string): boolean {
  // preview URLs
  if (hostname.endsWith(".taskeren.deno.net")) return true;
  return false;
}

hono.get("/login", (ctx) => {
  const data: StateData = {};

  // not the main site
  const requestUrl = new URL(ctx.req.url);
  // skip the main site (d2.elytra.cn),
  // and the local dev (127.0.0.1).
  // the local dev has a separated API setup, so the callback doesn't need a redirect from the main site.
  if (
    requestUrl.hostname !== "d2.elytra.cn" &&
    requestUrl.hostname !== "127.0.0.1"
  ) {
    log.debug(`Preview site found. (forwardCallback = ${requestUrl.hostname})`);
    data.forwardCallback = requestUrl.hostname;
  }

  const url = new URL("https://www.bungie.net/en/oauth/authorize");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", encodeState(data));

  return ctx.redirect(url);
});

hono.get("/cb", async (ctx) => {
  const code = ctx.req.query("code");
  const state = decodeState<StateData>(ctx.req.query("state"));

  const requestUrl = new URL(ctx.req.url);

  // main site only, so that it won't be "too many redirects".
  if (requestUrl.hostname === MAIN_SITE) {
    // handle callback forward,
    // so that oauth required functions can be tested on preview sites.
    if (state?.forwardCallback) {
      // check if the forwarded site is valid.
      // we don't want to redirect to malicious sites.
      if (!allowCallbackForward(state.forwardCallback)) {
        throw new Error(`Malicious forward callback: ${state.forwardCallback}`);
      }
      const url = new URL(ctx.req.url);
      url.hostname = state.forwardCallback;
      log.info(`Executing callback forwarding to ${state.forwardCallback}.`);
      return ctx.redirect(url);
    }
  }

  if (!code) ctx.text("Missing granted code", 401);

  await updateAuthByAuthorizationCode(ctx, code);

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

hono.get("/logout", (ctx) => {
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

hono.get("/usercard", async (ctx) => {
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
