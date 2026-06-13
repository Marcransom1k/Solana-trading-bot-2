# DropViral AI Launch Landing Page

Mobile-first static product showcase for the DropViral AI June 2026 launch catalog.

## What this repo serves

`npm start` serves only the public landing page from `public/` on port `3000` by default. The runtime does not start messaging bots, trading jobs, external API polling, or checkout side effects.

## Launch catalog

1. **Self-Cleaning Steam Pet Brush** — pet-care grooming brush with a misting visual hook and self-cleaning peel moment.
2. **HY300 Portable Android Smart Projector** — compact projector positioned around cozy ceiling movie-night transformations.
3. **LED Car Hand Gesture Light** — remote-controlled rear-window LED gesture light for driver communication.

The page uses approved shared marketing imagery and product angles from the team launch plan. Buying links are intentionally placeholders until affiliate or dropshipping fulfillment links are approved.

## Commands

```bash
npm install
npm test
npm start
```

- `npm test` runs static, non-side-effecting checks.
- `npm start` runs `node server.js` and binds to `0.0.0.0` with `PORT=3000` by default.

## Deployment

The included `render.yaml` deploys the same static server:

- Build: `npm ci`
- Start: `npm start`
- Health check path: `/`

## Safety notes

This repository has been converted away from its previous automation purpose. Do not reintroduce background trading, wallet, Telegram, or external polling code into the production start path for DropViral.
