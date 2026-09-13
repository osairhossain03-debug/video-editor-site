// app.js — connects the front-end to the backend API.
// Everything here talks to the endpoints defined in server.js.

// ---------- helpers ----------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function timeAgo(isoString) {
  const seconds = Math.floor((Date.now() - new Date(isoString)) / 1000);
  const units = [
    ['year', 31536000], ['month', 2592000], ['week', 604800],
    ['day', 86400], ['hour', 3600], ['minute', 60],
  ];
  for (const [name, secs] of units) {
    const value = Math.floor(seconds / secs);
    if (value >= 1) return `${value} ${name}${value > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

function initials(name) {
  return (name || 'A')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// ---------- portfolio ----------
async function loadPortfolio() {
  const grid = document.getElementById('portfolio-grid');
  if (!grid) return;
  try {
    const res = await fetch('/api/portfolio');
    const items = await res.json();

    if (!items.length) {
      grid.innerHTML = '<p class="section-note">No portfolio items yet.</p>';
      return;
    }

    grid.innerHTML = items.map((item) => `
      <div class="clip">
        <div class="clip-thumb">
          ${item.videoUrl
            ? `<video controls preload="metadata" playsinline>
                 <source src="${escapeHtml(item.videoUrl)}" type="video/mp4">
                 Your browser does not support video playback.
               </video>`
            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;
                    background:linear-gradient(135deg,#EDE9FF,#DCEBFF);color:var(--text-muted);
                    font-size:13px;text-align:center;padding:10px;box-sizing:border-box;">
                 Video coming soon
               </div>`
          }
        </div>
        <div class="clip-body">
          <p class="clip-cat">${escapeHtml(item.category)}</p>
          <h3 class="clip-title">${escapeHtml(item.title)}</h3>
          <p class="clip-desc">${escapeHtml(item.description)}</p>
        </div>
      </div>
    `).join('');
  } catch (err) {
    grid.innerHTML = '<p class="section-note">Could not load portfolio right now.</p>';
  }
}

// ---------- comments ----------
async function loadComments() {
  const list = document.getElementById('comments-list');
  if (!list) return;
  try {
    const res = await fetch('/api/comments');
    const comments = await res.json();

    if (!comments.length) {
      list.innerHTML = '<p class="comment-note">No comments yet — be the first.</p>';
      return;
    }

    list.innerHTML = comments.map((c) => `
      <div class="comment">
        <div class="comment-avatar">${escapeHtml(initials(c.name))}</div>
        <div>
          <div>
            <span class="comment-name">${escapeHtml(c.name)}</span>
            <span class="comment-date">${timeAgo(c.createdAt)}</span>
          </div>
          <p>${escapeHtml(c.text)}</p>
        </div>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = '<p class="comment-note">Could not load comments right now.</p>';
  }
}

function wireCommentForm() {
  const form = document.getElementById('comment-form');
  if (!form) return;
  const status = document.getElementById('comment-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const payload = {
      name: formData.get('name'),
      text: formData.get('comment'),
      website: formData.get('website'), // honeypot
    };

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      status.textContent = data.message || 'Thanks! Your comment will show once reviewed.';
      form.reset();
    } catch (err) {
      status.textContent = err.message || 'Could not post your comment. Please try again.';
    }
  });
}

// ---------- order / project request form ----------
function wireOrderForm() {
  const form = document.getElementById('order-form');
  if (!form) return;
  const status = document.getElementById('order-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const payload = {
      name: formData.get('name'),
      email: formData.get('email'),
      service: formData.get('service'),
      project: formData.get('project'),
      website: formData.get('website'), // honeypot
    };

    status.style.color = 'var(--text-muted)';
    status.textContent = 'Sending…';

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      status.style.color = 'var(--green)';
      status.textContent = data.message || "Thanks! I'll get back to you soon.";
      form.reset();
    } catch (err) {
      status.style.color = 'var(--coral)';
      status.textContent = err.message + ' You can also email osairhossain03@gmail.com directly.';
    }
  });
}

// ---------- boot ----------
document.addEventListener('DOMContentLoaded', () => {
  loadPortfolio();
  loadComments();
  wireCommentForm();
  wireOrderForm();
});
