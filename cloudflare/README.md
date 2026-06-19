# Cloudflare Language Routing

FlySolo is built as a static multilingual Hugo site:

- English: `/`
- Dutch: `/nl/`

GitHub Pages cannot read request headers, so country-based language suggestion needs to run at Cloudflare's edge.

Cloudflare adds the `CF-IPCountry` request header before forwarding traffic to the origin or a Worker. The Worker in `worker.js` uses that header to suggest Dutch for visitors from the Netherlands and English for everyone else.

## Behavior

- `CF-IPCountry: NL` visiting `/` is redirected to `/nl/`.
- All other countries stay on `/`.
- `?lang=nl` sets a `flysolo_lang=nl` cookie and redirects to the Dutch path.
- `?lang=en` sets a `flysolo_lang=en` cookie and redirects to the English path.
- Static assets are never redirected.

## Cloudflare Setup

Deploy `worker.js` as a Cloudflare Worker and attach it to the route:

```text
flysolo.me/*
```

The site remains hosted on GitHub Pages. The Worker only handles language routing before passing requests through.
