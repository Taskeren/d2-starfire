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
