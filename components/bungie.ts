import { HttpClient } from "bungie-api-ts/http";
import { Context } from "hono";
import { AuthorizationResponse, updateAuthByRefreshToken } from "./auth.ts";
import { appToken } from "../main.ts";
import logger from "../log.ts";

const log = logger("bungieApi");

export class AuthenticationError extends Error {}

export class BungieApiError extends Error {}

export type BungieClientOptions = {
  ctx?: Context;
  loginAs?: AuthorizationResponse;
};

/**
 * Send a request to Bungie with body and params.
 *
 * If the ctx is assigned, it may update the cookies inside, to update the login information if authentication error occurrs.
 *
 * @returns the result
 */
export function bungieClient(options?: BungieClientOptions): HttpClient {
  const fetchOnly: HttpClient = async (conf) => {
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
    if (options?.loginAs) {
      headers.set("Authorization", `Bearer ${options?.loginAs.access_token}`);
    }

    // log the requesting
    log.debug("Sending request to Bungie API", url, conf.method, body);

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
        let response_text: string;
        try {
          response_text = await response.text();
        } catch (error) {
          log.error(
            "Received non-success (!2xx) response from Bungie API, and the response payload can't be read.",
            response.status,
            error,
          );
          throw new BungieApiError();
        }

        log.warn(
          "Received non-success (!2xx) response from Bungie API",
          response.status,
          response_text,
        );

        try {
          // happy if it can still be parsed to JSON (other errors).
          return JSON.parse(response_text);
        } catch (_e) {
          // expected malformed JSON body, could be XML or HTML, etc.
          // throwing to prevent from handling invalid data.
          throw new BungieApiError();
        }
      }
    });
  };

  // a wrapper that handles authentication error for the first time.
  return async (conf) => {
    try {
      return await fetchOnly(conf);
    } catch (e: unknown) {
      if (e instanceof AuthenticationError) {
        if (options.ctx && options?.loginAs?.refresh_token) {
          log.debug(
            "Received unauthorized response (401), refreshing the token for the user.",
          );
          await updateAuthByRefreshToken(
            options.ctx,
            options.loginAs.refresh_token,
          );
          return await fetchOnly(conf);
        }
      }
      // recovered once, or not authentication error, rethrow it to the upper level.
      log.warn("Exception occurred while sending request to Bungie API", e);
      throw e;
    }
  };
}
