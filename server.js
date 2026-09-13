// server.js — backend for Osair Hossain's video editor site
//
// What this does:
//   - Serves the front-end (public/index.html, public/admin.html) as static files
//   - Provides an API for portfolio items, comments, and project submissions
//   - Stores everything in simple JSON files under /data (no database setup needed)
//   - Protects write/admin actions with a shared admin key (see .env.example)
//
// Run it with:  npm install   then   npm start
// Then open:    http://localhost:3000

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-me-now';

if (ADMIN_KEY === 'change-me-now') {
  console.warn(
    '\n⚠️  ADMIN_KEY is not set — using the default "change-me-now".\n' +
    '   Anyone who finds this could manage your site. Set a real ADMIN_KEY\n' +
    '   environment variable before putting this online (see .env.example).\n'
  );
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- tiny JSON-file "database" helpers ----------
const DATA_DIR = path.join(__dirname, 'data');
const files = {
  portfolio: path.join(DATA_DIR, 'portfolio.json'),
  comments: path.join(DATA_DIR, 'comments.json'),
  submissions: path.join(DATA_DIR, 'submissions.json'),
};

function readData(name) {
  try {
    return JSON.parse(fs.readFileSync(files[name], 'utf8'));
  } catch (err) {
    return [];
  }
}

function writeData(name, data) {
  fs.writeFileSync(files[name], JSON.stringify(data, null, 2));
}

function nextId(list) {
  return list.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
}

// Basic protection against storing huge junk in text fields
function clean(str, maxLen) {
  return String(str || '').trim().slice(0, maxLen);
}

// ---------- admin auth ----------
// Every admin (write/manage) route checks this header:
//   x-admin-key: <your ADMIN_KEY>
function requireAdmin(req, res, next) {
  const key = req.get('x-admin-key');
  if (key && key === ADMIN_KEY) return next();
  return res.status(401).json({ error: 'Missing or incorrect admin key.' });
}

// =========================================================
// PORTFOLIO
// =========================================================

// Public: list all portfolio items
app.get('/api/portfolio', (req, res) => {
  res.json(readData('portfolio'));
});

// Admin: add a portfolio item
app.post('/api/portfolio', requireAdmin, (req, res) => {
  const items = readData('portfolio');
  const item = {
    id: nextId(items),
    category: clean(req.body.category, 60) || 'Video Editing',
    title: clean(req.body.title, 100) || 'Untitled project',
    description: clean(req.body.description, 300),
    videoUrl: clean(req.body.videoUrl, 500),
  };
  items.push(item);
  writeData('portfolio', items);
  res.status(201).json(item);
});

// Admin: edit a portfolio item
app.put('/api/portfolio/:id', requireAdmin, (req, res) => {
  const items = readData('portfolio');
  const idx = items.findIndex((i) => i.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found.' });
  items[idx] = {
    ...items[idx],
    category: clean(req.body.category, 60) || items[idx].category,
    title: clean(req.body.title, 100) || items[idx].title,
    description: clean(req.body.description, 300),
    videoUrl: clean(req.body.videoUrl, 500),
  };
  writeData('portfolio', items);
  res.json(items[idx]);
});

// Admin: delete a portfolio item
app.delete('/api/portfolio/:id', requireAdmin, (req, res) => {
  const items = readData('portfolio');
  const next = items.filter((i) => i.id !== Number(req.params.id));
  writeData('portfolio', next);
  res.json({ ok: true });
});

// =========================================================
// COMMENTS  (public feedback wall, moderated before showing)
// =========================================================

// Public: only approved comments, newest first
app.get('/api/comments', (req, res) => {
  const approved = readData('comments')
    .filter((c) => c.approved)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(approved);
});

// Public: submit a new comment (goes to a pending queue, not shown yet)
app.post('/api/comments', (req, res) => {
  // honeypot: real visitors never fill this hidden field in; bots often do
  if (clean(req.body.website, 50)) {
    return res.status(200).json({ ok: true }); // pretend success, drop silently
  }
  const text = clean(req.body.text, 500);
  if (!text) return res.status(400).json({ error: 'Comment text is required.' });

  const comments = readData('comments');
  const comment = {
    id: nextId(comments),
    name: clean(req.body.name, 60) || 'Anonymous',
    text,
    approved: false,
    createdAt: new Date().toISOString(),
  };
  comments.push(comment);
  writeData('comments', comments);
  res.status(201).json({ ok: true, message: 'Thanks! Your comment will show once reviewed.' });
});

// Admin: see every comment, including pending ones
app.get('/api/comments/all', requireAdmin, (req, res) => {
  const all = readData('comments').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(all);
});

// Admin: approve a pending comment
app.post('/api/comments/:id/approve', requireAdmin, (req, res) => {
  const comments = readData('comments');
  const idx = comments.findIndex((c) => c.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found.' });
  comments[idx].approved = true;
  writeData('comments', comments);
  res.json(comments[idx]);
});

// Admin: delete a comment
app.delete('/api/comments/:id', requireAdmin, (req, res) => {
  const comments = readData('comments');
  const next = comments.filter((c) => c.id !== Number(req.params.id));
  writeData('comments', next);
  res.json({ ok: true });
});

// =========================================================
// PROJECT SUBMISSIONS  (the "Order a project" form)
// =========================================================

// Public: submit a new project request
app.post('/api/contact', (req, res) => {
  if (clean(req.body.website, 50)) {
    return res.status(200).json({ ok: true }); // honeypot
  }
  const name = clean(req.body.name, 100);
  const email = clean(req.body.email, 150);
  const service = clean(req.body.service, 80);
  const project = clean(req.body.project, 2000);

  if (!name || !email || !project) {
    return res.status(400).json({ error: 'Name, email, and project details are required.' });
  }

  const submissions = readData('submissions');
  const submission = {
    id: nextId(submissions),
    name,
    email,
    service,
    project,
    status: 'new',
    createdAt: new Date().toISOString(),
  };
  submissions.push(submission);
  writeData('submissions', submissions);
  res.status(201).json({ ok: true, message: "Thanks! I'll get back to you soon." });
});

// Admin: list submissions
app.get('/api/submissions', requireAdmin, (req, res) => {
  const all = readData('submissions').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(all);
});

// Admin: update a submission's status (e.g. "read", "replied", "archived")
app.put('/api/submissions/:id', requireAdmin, (req, res) => {
  const submissions = readData('submissions');
  const idx = submissions.findIndex((s) => s.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found.' });
  submissions[idx].status = clean(req.body.status, 30) || submissions[idx].status;
  writeData('submissions', submissions);
  res.json(submissions[idx]);
});

// Admin: delete a submission
app.delete('/api/submissions/:id', requireAdmin, (req, res) => {
  const submissions = readData('submissions');
  const next = submissions.filter((s) => s.id !== Number(req.params.id));
  writeData('submissions', next);
  res.json({ ok: true });
});

// =========================================================

app.listen(PORT, () => {
  console.log(`Site running at http://localhost:${PORT}`);
  console.log(`Admin panel at  http://localhost:${PORT}/admin.html`);
});
