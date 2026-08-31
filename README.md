# D2 Starfire

[Launch](https://d2.elytra.cn/)

Yet another website project for Destiny 2.

Since CloudFlare Workers has a limited fetch count per request, some features will be blocked.
And Deno Deploy seems to have less restrict on this, so I moved to it.

[Console](https://console.deno.com/taskeren/d2starfire)

The main change between starfire and activisme is,
Starfire tries to provide a rendered HTML if accepting `text/html`.
And the homepage uses HTMX to request for these endpoints.

Features requiring OAuth2 login will be updated here, otherwise in activisme.

## Contributing

You need to install Deno for developing.

Run `deno run dev` to start a local server, and the default URL will be <https://127.0.0.1:8787>, trust the self-signed SSL certificate in the browser.

Make sure you're using Prettier for formatting everything.

I'd prefer to separate JSX/TSX from regular JS/TS scripts, like `d2.ts` and `d2.tsx`.

Before implementing a new feature, always open an issue to check if I wanted it, otherwise, there will be a chance that your PR is rejected.

Keep everything in English, until there's an internationalization (i18n) framework.

## Deployment

Run `deno deploy` to deploy to Deno Deploy.

And there are few environments required for production:

| Environment Variable |          Description |
| :------------------- | -------------------: |
| `BG_API_KEY`         |       Bungie API key |
| `BG_CLIENT_ID`       |     Bungie Client ID |
| `BG_CLIENT_SECRET`   | Bungie Client Secret |

## Development

### Authorization Code Forwarding

Bungie OAuth systems can't custom the **redirect_uri**, so I'm using code forwarding to allow preview sites login.

Preview sites generates a login redirect to Bungie, with a special **state** with extra information encoded in Base64.
If the login success, the browser will be redirect to our main site with the authorization code, where the main site
extract the extra information, the forwarding host, and redirect the browser to that site.

```text
+----------------------+        +-------------------+        +----------------------+
|  Preview / Dev Site  |        |   BUNGIE          |        |    Main Auth Site    |
|  (in the whitelist)  |        |   OAUTH SERVICE   |        |   (d2.elytra.cn)     |
+----------------------+        +-------------------+        +----------------------+
           |                              |                             |
  1. Login | encode target origin         |                             |
     ----->| into `state`                 |                             |
           |----------------------------->|                             |
           |  https://www.bungie.net/...  |                             |
           |  ?state=base64encodedurl...  |                             |
           |                              |                             |
           |                              | 2. Redirect to fixed callback
           |                              |    with code & state        |
           |                              |---------------------------->|
           |                              |  https://d2.elytra.cn/cb    |
           |                              |  ?code=xxx&state=base64...  |
           |                              |                             |
           |                              |                             | 3. Read state,
           |                              |                             |    verify and redirect
           |                              |                             |
           | 4. Redirect                                                |
           |<-----------------------------------------------------------|
           |    https://d2starfire-abc.deno.net/auth/cb?code=xxx&sta... |
           |                                                            |
  5. Login | Get access token by                                        |
     ----->| the authorization code                                     |
```
