document.addEventListener('DOMContentLoaded', async () => {
  // Check for file protocol immediately
  if (window.location.protocol === 'file:') {
    const msg = 'This application must be run via the Node.js server to function correctly.\n\nPlease open http://localhost:3000 in your browser.';
    alert(msg);
    // Don't continue execution if running as file
    return;
  }

  const container = document.querySelector('.main-content');
  const user = await checkAuth();

  // Highlight active nav item
  const path = window.location.pathname;
  document.querySelectorAll('.nav-item').forEach(el => {
    // loosen comparison for file protocol or different roots
    if (el.getAttribute('href') === path || path.endsWith(el.getAttribute('href'))) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  if (!user) {
    // Allow landing page (/) and index.html
    if (path !== '/' && !path.endsWith('/index.html') && !path.endsWith('/')) {
      window.location.href = 'login.html';
      return;
    }
    renderLandingPage(container);
  } else {
    // Basic router
    if (path === '/' || path === '/index.html' || path === '/dashboard.html') {
      renderDashboard(container, user);
    }
    // Other pages are loaded normally as static HTML files
  }
});

async function checkAuth() {
  try {
    const res = await fetch('/api/user');
    if (res.ok) return await res.json();
    return null;
  } catch (e) {
    return null;
  }
}

function renderLandingPage(container) {

  container.innerHTML = `
    <div class="hero animate-fade-in" style="background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%); padding: 6rem 2rem; text-align: center;">
      <div style="max-width: 800px; margin: 0 auto;">
          <h1 style="font-size: 3.5rem; line-height: 1.1; margin-bottom: 1.5rem; background: linear-gradient(to right, var(--text-primary), var(--accent-primary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Your Home Projects.<br>Handled on Autopilot.</h1>
          <p style="font-size: 1.25rem; color: var(--text-secondary); margin-bottom: 2.5rem; max-width: 600px; margin-left: auto; margin-right: auto;">
            Stop chasing contractors. BlueCollarClaw's AI agents negotiate, schedule, and verify top-rated pros for you. 24/7.
          </p>
          <div class="cta-group" style="display: flex; gap: 1rem; justify-content: center;">
            <a href="login.html" class="cta-button" style="padding: 1rem 2.5rem; font-size: 1.1rem;">Get Started Free</a>
            <a href="#how-it-works" class="cta-button btn-secondary" style="padding: 1rem 2.5rem; font-size: 1.1rem; background: var(--bg-tertiary); color: var(--text-primary);">See How It Works</a>
          </div>
      </div>
    </div>

    <div class="features-section animate-fade-in animation-delay-100" style="padding: 6rem 2rem; max-width: 1200px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 4rem;">
        <h2 style="font-size: 2.5rem; margin-bottom: 1rem;">Why Homeowners Trust Us</h2>
        <p style="color: var(--text-secondary);">We've reimagined home services for the AI era.</p>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2.5rem;">
        <div class="feature-card" style="padding: 2.5rem; background: var(--bg-secondary); border-radius: 16px; border: 1px solid var(--border-color); transition: transform 0.2s;">
            <div style="width: 56px; height: 56px; background: rgba(59, 130, 246, 0.1); border-radius: 12px; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: center;">
                <i data-lucide="zap" style="width: 28px; height: 28px; color: var(--accent-primary);"></i>
            </div>
            <h3 style="font-size: 1.5rem; margin-bottom: 0.75rem;">Instant AI Matching</h3>
            <p style="color: var(--text-secondary); line-height: 1.6;">Skip the phone tag. Our AI analyzes your job and instantly dispatches it to the perfect pro in seconds, not days.</p>
        </div>
        <div class="feature-card" style="padding: 2.5rem; background: var(--bg-secondary); border-radius: 16px; border: 1px solid var(--border-color); transition: transform 0.2s;">
             <div style="width: 56px; height: 56px; background: rgba(16, 185, 129, 0.1); border-radius: 12px; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: center;">
                <i data-lucide="shield-check" style="width: 28px; height: 28px; color: var(--success);"></i>
            </div>
            <h3 style="font-size: 1.5rem; margin-bottom: 0.75rem;">Verified & Vetted</h3>
            <p style="color: var(--text-secondary); line-height: 1.6;">Every professional is rigorously vetted for license, insurance, and past performance. If they aren't 5-star, they aren't here.</p>
        </div>
        <div class="feature-card" style="padding: 2.5rem; background: var(--bg-secondary); border-radius: 16px; border: 1px solid var(--border-color); transition: transform 0.2s;">
             <div style="width: 56px; height: 56px; background: rgba(245, 158, 11, 0.1); border-radius: 12px; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: center;">
                 <i data-lucide="wallet" style="width: 28px; height: 28px; color: var(--warning);"></i>
            </div>
            <h3 style="font-size: 1.5rem; margin-bottom: 0.75rem;">Price Protection</h3>
            <p style="color: var(--text-secondary); line-height: 1.6;">Get guaranteed upfront quotes. Funds are held in escrow and only released when you're 100% satisfied.</p>
        </div>
      </div>
    </div>

    <div id="how-it-works" class="steps-section" style="background: var(--bg-tertiary); padding: 6rem 2rem; border-top: 1px solid var(--border-color);">
        <div style="max-width: 1200px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 5rem;">
                <h2 style="font-size: 2.5rem; margin-bottom: 1rem;">How It Works</h2>
                <p style="color: var(--text-secondary);">From to-do list to done in three steps.</p>
            </div>

             <div style="display: flex; flex-wrap: wrap; gap: 4rem; justify-content: center; position: relative;">
                <div style="flex: 1; min-width: 280px; text-align: center; position: relative; z-index: 1;">
                    <div style="font-size: 5rem; font-weight: 900; color: var(--accent-primary); opacity: 0.1; position: absolute; top: -40px; left: 50%; transform: translateX(-50%); z-index: -1;">01</div>
                    <div style="width: 80px; height: 80px; background: var(--bg-secondary); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; border: 2px solid var(--border-color);">
                        <i data-lucide="message-square-plus" style="width: 32px; height: 32px; color: var(--text-primary);"></i>
                    </div>
                    <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem;">Post Your Job</h3>
                    <p style="color: var(--text-secondary);">Describe what you need. Snap a photo. Our AI handles the details.</p>
                </div>
                <div style="flex: 1; min-width: 280px; text-align: center; position: relative; z-index: 1;">
                     <div style="font-size: 5rem; font-weight: 900; color: var(--accent-primary); opacity: 0.1; position: absolute; top: -40px; left: 50%; transform: translateX(-50%); z-index: -1;">02</div>
                     <div style="width: 80px; height: 80px; background: var(--bg-secondary); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; border: 2px solid var(--border-color);">
                        <i data-lucide="cpu" style="width: 32px; height: 32px; color: var(--text-primary);"></i>
                    </div>
                    <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem;">AI Matching</h3>
                    <p style="color: var(--text-secondary);">We instantly notify the best-rated pros in your area who are available now.</p>
                </div>
                <div style="flex: 1; min-width: 280px; text-align: center; position: relative; z-index: 1;">
                     <div style="font-size: 5rem; font-weight: 900; color: var(--accent-primary); opacity: 0.1; position: absolute; top: -40px; left: 50%; transform: translateX(-50%); z-index: -1;">03</div>
                     <div style="width: 80px; height: 80px; background: var(--bg-secondary); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; border: 2px solid var(--border-color);">
                        <i data-lucide="check-circle-2" style="width: 32px; height: 32px; color: var(--text-primary);"></i>
                    </div>
                    <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem;">Job Done</h3>
                    <p style="color: var(--text-secondary);">Review quotes, hire with a click, and pay only when you're happy.</p>
                </div>
             </div>
        </div>
    </div>
  `;
  lucide.createIcons();
}

function renderDashboard(container, user) {
  // Fetch real stats
  fetch('/api/analytics')
    .then(res => res.json())
    .then(data => {
      document.getElementById('total-pros').innerText = data.totalContractors || 0;
      document.getElementById('active-jobs').innerText = data.activeRequests || 0;
      document.getElementById('total-bookings').innerText = data.totalBookings || 0;
    })
    .catch(err => console.error(err));

  // Render Layout
  container.innerHTML = `
    <header class="header animate-fade-in">
      <div class="header-content">
        <h1>Dashboard</h1>
        <p style="color:var(--text-secondary)">Overview for ${user.name} (${user.role})</p>
      </div>
      <div class="user-profile">
        <div class="avatar">${user.name.charAt(0).toUpperCase()}</div>
        <span>${user.name}</span>
      </div>
    </header>

    <div class="stats-grid animate-fade-in">
      <div class="stat-card">
        <div class="stat-label">Network Pros</div>
        <div class="stat-value" id="total-pros">-</div>
        <div class="stat-decor">🔨</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Live Jobs</div>
        <div class="stat-value" id="active-jobs">-</div>
        <div class="stat-decor">⚡</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Your Bookings</div>
        <div class="stat-value" id="total-bookings">-</div>
        <div class="stat-decor">📅</div>
      </div>
    </div>

    <div class="section-card animate-fade-in">
      <div class="card-header">
        <div class="card-title">Recent Activity</div>
      </div>
      <div class="table-responsive">
        <table id="activity-table">
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Service</th>
              <th>Location</th>
              <th>Status</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colspan="5" style="text-align:center; padding: 2rem;">Loading live data...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Poll for data
  fetchbookings();
}

async function fetchbookings() {
  try {
    const res = await fetch('/api/bookings?limit=5');
    const bookings = await res.json();
    const tbody = document.querySelector('#activity-table tbody');

    if (!tbody) return;

    if (bookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No recent bookings.</td></tr>';
      return;
    }

    tbody.innerHTML = bookings.map(b => `
      <tr>
        <td style="font-family:monospace; color:var(--text-secondary)">#${b.id.substring(0, 6)}</td>
        <td style="color:var(--text-primary); font-weight:500">${b.trade}</td>
        <td>${b.location}</td>
        <td><span class="badge ${getStatusBadge(b.status)}">${b.status}</span></td>
        <td style="color:var(--success); font-weight:600">$${b.rate}/hr</td>
      </tr>
    `).join('');
  } catch (e) {
    console.error(e);
  }
}

function getStatusBadge(status) {
  if (status === 'confirmed') return 'badge-success';
  if (status === 'pending') return 'badge-warning';
  return 'badge-neutral';
}
