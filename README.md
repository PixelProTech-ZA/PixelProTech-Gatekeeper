# PixelProTech Gatekeeper

Employee attendance, visitor management and building-occupancy prototype for **PixelProTech Solutions (Pty) Ltd** (Reg 2026/622131/07, Gauteng, South Africa).

## Run

Open `index.html` in a browser. No build step, no dependencies. Works on GitHub Pages as-is (serve the repository root).

## Files

| File | Purpose |
|---|---|
| `index.html` | Kiosk, security console and blueprint tabs |
| `styles.css` | Brand tokens and layout |
| `app.js` | State, kiosk flow, visitor timers, occupancy rules, audit chain |
| `manifest.webmanifest` | PWA manifest (name, colours, icons) |
| `sw.js` | Service worker: caches the app shell for offline loading |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `favicon.ico` | App icons |
| `README.md` | This file |

## Install as an app

Service workers need HTTPS or localhost, so this works on GitHub Pages or any HTTPS host, not by double-clicking `index.html`. Once opened over HTTPS, use the browser's Install option. Offline, the app loads from cache, but data is still in memory only and is lost on reload. If you change any file, bump `V` in `sw.js` so installed copies update.

## What is real

- Employee enrolment, code entry, retry lock-out and duplicate protection
- Staff-verified attendance: kiosk requests verification, a staff member checks photo ID and records clock-in or clock-out, flagged as manual
- Visitor appointments with a 30-minute timer from actual check-in, 5-minute warning, expiry, and extension or resolution only with a recorded reason
- Occupancy statuses (confirmed present, last recorded present, departure confirmed, unknown/discrepancy) with evidence source and age
- Role-based panel visibility and a hash-chained audit log (SHA-256, Web Crypto)

## What is not connected

Face and voice verification, liveness, door controllers, SMS/email notifications, MFA, server-side permission checks, and any database. Role switching is a UI control, not security. Data lives in browser memory and is lost on reload. The kiosk says so wherever it matters; presence can only be confirmed by staff observation until door hardware is integrated.

Do not enter real personal information until a backend, access control and a POPIA privacy impact assessment are in place.

## Test mode

The console has a "Test mode: 1 s = 1 min" switch so the 30-minute visit timer can be exercised quickly. It is off by default.

## Brand palette (sampled from the 2026 Corporate Capability Profile)

| Token | Hex |
|---|---|
| Background | `#07070a` |
| Accent (teal) | `#00d4aa` |
| Text | `#f1eefa` |
| Secondary text | `#9a90b8` |
| Muted | `#524b6a` |
| Borders | `#363146` |

Amber (warning) and red (critical) are functional status colours, not brand colours.

## Next stages

1. Backend (PostgreSQL, OIDC login, server-side RBAC, append-only audit store)
2. Door-controller and sensor integration for presence evidence
3. Biometric adapter, only after a POPIA lawful-basis decision and measured error rates
4. Notification service with delivery receipts
