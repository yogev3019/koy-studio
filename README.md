# KOY Studio

A small phone web app for KOY COSMETICS (spray tan). Keren takes or picks a client photo and gets a finished Instagram story or post in the brand design, ready to save and upload. It also keeps a simple client list and a work calendar.

- **Private by design:** there is no server and no account. Clients, appointments and settings are stored only on the phone (browser storage), and photos never leave the device. The Backup button exports a JSON file.
- **Works offline** after the first visit (service worker), and installs to the home screen.
- **Plain static files:** HTML, CSS and JavaScript, with no build step and no dependencies.

## Files
| Path | What |
|---|---|
| `index.html` | Screens: Create, Calendar, Clients, Settings |
| `js/render.js` | Canvas renderer for the brand templates (story 1080×1920, post 1080×1350, open-slots story) |
| `js/app.js` | App logic: creator, calendar, clients, WhatsApp reminders, backup, install hints |
| `css/app.css` | Golden Hour palette, light background with dark text |
| `fonts/` | Assistant and Josefin Sans (SIL Open Font License, license files included) |
| `assets/` | KOY COSMETICS logo (vector), sun symbol, app icons |
| `sw.js` | Offline cache. **Bump `VERSION` on every release** so phones update |

## Release
Edit the files, bump `VERSION` in `sw.js`, commit and push to `main`. GitHub Pages serves the site from the repository root.

Brand and app © KOY COSMETICS. Fonts © their authors under OFL 1.1.
