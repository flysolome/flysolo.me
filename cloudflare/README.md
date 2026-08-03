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

## Trial Application Email

The Worker also handles `POST /api/beta` from the bilingual trial form. It validates the submitted user and business details, checks a timing field and honeypot, sends a plain-text application to `beta@flysolo.me`, and redirects the visitor back to the form's confirmation state.

Configure a Cloudflare Email Service send binding named `BETA_EMAIL` with `beta@flysolo.me` as its allowed destination. The sender address used by the Worker is `website@flysolo.me`; the `flysolo.me` domain must be onboarded for sending, and `beta@flysolo.me` must be a verified destination.

The edge route must continue to cover `flysolo.me/*` so `/api/beta` reaches this Worker before GitHub Pages.

The included `wrangler.toml` defines the route and send-email binding. Deploy from the site repository with:

```text
npx wrangler deploy --config cloudflare/wrangler.toml
```
