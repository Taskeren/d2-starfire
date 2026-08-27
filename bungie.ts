import { HttpClient } from "bungie-api-ts/http";
import { AuthorizationResponse } from "./auth.ts";
import { appToken } from "./main.ts";

export class AuthenticationError extends Error {}

export function bungieClient(loginAs?: AuthorizationResponse): HttpClient {
  return async (conf) => {
    // process URL with search params
    const url = new URL(conf.url);
    if (conf.params) {
      Object.entries(conf.params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    // serialize body content
    const body = conf.body ? JSON.stringify(conf.body) : undefined;

    // prepare login information is provided
    const headers = new Headers();
    headers.set("X-API-Key", appToken);
    if (loginAs) {
      headers.set("Authorization", `Bearer ${loginAs.access_token}`);
    }

    return await fetch(url, {
      method: conf.method,
      body,
      headers,
    }).then(async (response) => {
      if (response.ok) {
        return response.json();
      } else if (response.status == 401) {
        throw new AuthenticationError(
          "Authentication failure during Bungie API call!",
        );
      } else {
        let body: string;
        try {
          body = await response.text();
        } catch (e) {
          return console.error(
            "Non-2xx response from Bungie API, and can't read the body.",
            response.status,
            e,
          );
        }

        console.warn("Non-2xx response from Bungie API", response.status, body);

        try {
          // happy if it can still be parsed to JSON (other errors).
          return JSON.parse(body);
        } catch (_e) {
          // expected malformed JSON body, could be XML or HTML, etc.
          // throwing to prevent from handling invalid data.
          throw new Error("Non-JSON response from Bungie API.");
        }
      }
    });
  };
}
