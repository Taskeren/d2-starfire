import { Hono } from "hono";
import { accepts } from "hono/accepts";
import { HonoSpec } from "../main.ts";
import { Homepage } from "./templates/homepage.tsx";
import { Unauthorized } from "./templates/root.tsx";

const hono: HonoSpec = new Hono();

export default hono;

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

hono.get("/401", (ctx) => {
  return ctx.html(Unauthorized());
});
