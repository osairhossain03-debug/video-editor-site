# Osair Hossain — Video Editor Site (with backend)

This turns your static page into a real site with a backend: a server, data
storage, and an admin panel to manage everything — no more editing HTML by
hand or relying on `mailto:` links.

## What was added

- **`server.js`** — a small Node.js/Express server that serves your site and
  handles three things:
  - **Portfolio** — `GET/POST/PUT/DELETE /api/portfolio`
  - **Comments** — public visitors can post a comment; it stays hidden until
    you approve it in the admin panel (`GET/POST /api/comments`, plus
    admin-only moderation routes)
  - **Project requests** — the "Order a project" form now actually saves
    submissions instead of just opening an email draft (`POST /api/contact`,
    `GET /api/submissions` for you)
- **`data/*.json`** — where everything is stored. Simple JSON files, no
  database setup required. Good for a personal site; see "Scaling up" below
  if you outgrow it.
- **`public/admin.html`** — a private dashboard (not linked from your public
  nav) where you can review project requests, approve or delete comments,
  and add/remove portfolio items.
- **`public/app.js`** — front-end JavaScript that connects your existing
  design to the backend (loads the portfolio and comments, submits the
  forms).
- Your original `index.html` is unchanged in look and feel — only the
  portfolio grid, comment section, and order form now talk to the backend
  instead of being static or `mailto`-based.

## ⚠️ Fix this first: your portfolio videos

Your original file pointed to videos on your own computer:
```
file:///D:/2026/VIDEO/20260503_175527.mp4
```
That only ever worked on your PC. Visitors to the live site can't see those
files at all. You have two options:

1. **Upload your videos somewhere public** (a cheap/free option: a
   Cloudinary or Bunny.net account, an S3 bucket, or even an unlisted
   YouTube video) and paste that URL into the admin panel's "Video URL"
   field for each project.
2. Leave the "Video URL" field blank and the site will show a "Video coming
   soon" placeholder instead of a broken player — better than a dead link.

## Running it locally

You'll need [Node.js](https://nodejs.org) installed (v18 or newer).

```bash
npm install
npm start
```

Then open **http://localhost:3000** for the site, and
**http://localhost:3000/admin.html** for the admin panel.

## Setting your admin password

Right now the admin key defaults to `change-me-now` — anyone who guesses it
could edit your site. Set your own before putting this online:

```bash
# macOS/Linux
export ADMIN_KEY="something-long-and-random"
npm start

# Windows (PowerShell)
$env:ADMIN_KEY="something-long-and-random"
npm start
```

See `.env.example` for reference. If you deploy to a host like Render or
Railway, set `ADMIN_KEY` in their environment variable settings instead.

## Putting it online

This needs a host that can run a Node.js server continuously (unlike your
old file, this can't just be opened from disk or dropped into static
hosting like GitHub Pages). Reasonable low-cost/free options:

- **Render** or **Railway** — connect a GitHub repo, they run `npm start`
  for you, and let you set `ADMIN_KEY` in their dashboard.
- **A basic VPS** (DigitalOcean, Linode, etc.) if you want more control.

Whichever you choose, the steps are the same: upload this project, set
`ADMIN_KEY`, run `npm install && npm start`.

## Scaling up later

JSON files are fine for a personal portfolio site with light traffic. If
comments or requests start piling up, or you want multiple people editing
at once, swap `data/*.json` for a real database — SQLite (still needs no
separate server) or PostgreSQL/MongoDB (if you move to a bigger host) are
the natural next steps. The API routes in `server.js` are already separated
from storage, so that swap only touches the `readData`/`writeData` helpers.

## Project structure

```
.
├── server.js           # backend + API
├── package.json
├── .env.example
├── data/
│   ├── portfolio.json
│   ├── comments.json
│   └── submissions.json
└── public/
    ├── index.html       # your site (unchanged design)
    ├── app.js            # connects the front-end to the API
    └── admin.html        # private management dashboard
```
