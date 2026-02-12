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
    <div class="animate-fade-in">
        <!-- Hero Section -->
        <div class="hero-wrapper">
             <div class="hero">
                <h1>Your Home Projects.<br><span>Handled on Autopilot.</span></h1>
                <p>
                    Stop chasing contractors. BlueCollarClaw's AI agents negotiate, schedule, and verify top-rated pros for you. 24/7.
                </p>
                <div class="cta-group">
                    <a href="login.html" class="cta-button">
                        Get Started Free <i data-lucide="arrow-right" style="width:18px"></i>
                    </a>
                    <a href="#how-it-works" class="cta-button secondary">
                        See How It Works
                    </a>
                </div>
            </div>
        </div>

        <!-- Trust Signals -->
        <div style="text-align: center; margin-bottom: 4rem;">
            <p style="text-transform: uppercase; font-size: 0.75rem; color: #94a3b8; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 1.5rem;">Trusted Technology</p>
            <div style="display: flex; gap: 3rem; justify-content: center; opacity: 0.5; filter: grayscale(1);">
                <div style="font-weight: 700; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem;"><i data-lucide="shield"></i> OpenClaw</div>
                <div style="font-weight: 700; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem;"><i data-lucide="cpu"></i> AI-Native</div>
                <div style="font-weight: 700; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem;"><i data-lucide="check-circle"></i> Verified</div>
            </div>
        </div>

        <!-- Features Grid -->
        <div class="stats-grid">
            <div class="stat-card" style="text-align: left; padding: 2rem;">
                <div style="width: 48px; height: 48px; background: rgba(37, 99, 235, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--brand-primary); margin-bottom: 1.5rem;">
                    <i data-lucide="zap" style="width: 24px; height: 24px;"></i>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem;">Instant AI Matching</h3>
                <p style="color: var(--text-secondary); line-height: 1.6;">Skip the phone tag. Our AI analyzes your job and instantly dispatches it to the perfect pro.</p>
            </div>
            <div class="stat-card" style="text-align: left; padding: 2rem;">
                 <div style="width: 48px; height: 48px; background: rgba(5, 150, 105, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--success); margin-bottom: 1.5rem;">
                    <i data-lucide="shield-check" style="width: 24px; height: 24px;"></i>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem;">Verified & Vetted</h3>
                <p style="color: var(--text-secondary); line-height: 1.6;">Every professional is rigorously vetted for license and insurance. 5-star quality guaranteed.</p>
            </div>
            <div class="stat-card" style="text-align: left; padding: 2rem;">
                 <div style="width: 48px; height: 48px; background: rgba(217, 119, 6, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--warning); margin-bottom: 1.5rem;">
                    <i data-lucide="wallet" style="width: 24px; height: 24px;"></i>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem;">Price Protection</h3>
                <p style="color: var(--text-secondary); line-height: 1.6;">Get guaranteed upfront quotes. Funds are held in escrow and only released when you're happy.</p>
            </div>
        </div>
    </div>
  `;
  lucide.createIcons();
}

function renderDashboard(container, user) {
  // Fetch real stats (keep this)
  fetch('/api/analytics')
    .then(res => res.json())
    .then(data => {
      const liveJobs = document.getElementById('live-jobs-val');
      const networkPros = document.getElementById('network-pros-val');
      const yourBookings = document.getElementById('your-bookings-val');

      if (liveJobs) liveJobs.innerText = data.activeRequests || 0;
      if (networkPros) networkPros.innerText = data.totalContractors || 0;
      if (yourBookings) yourBookings.innerText = data.totalBookings || 0;
    })
    .catch(err => console.error(err));

  const isHomeowner = user.role === 'homeowner';

  // Render Layout
  container.innerHTML = `
    <div class="animate-fade-in">
        <!-- Welcome Banner -->
        <div class="dashboard-welcome">
            <div class="welcome-content">
                <div class="welcome-title">Welcome back, ${user.name.split(' ')[0]}</div>
                <div class="welcome-subtitle">
                    ${isHomeowner ? 'Ready to tackle your next home project?' : 'Let\'s find your next big job.'}
                    <br>BlueCollarClaw agents are standing by.
                </div>
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions-grid">
             ${isHomeowner ? `
                <div class="action-card" onclick="document.querySelector('.cta-button')?.click() || (window.location.href='jobs.html')">
                    <div class="action-icon"><i data-lucide="plus-circle"></i></div>
                    <div class="action-label">Post a New Job</div>
                </div>
                <a href="contractors.html" class="action-card">
                    <div class="action-icon"><i data-lucide="search"></i></div>
                    <div class="action-label">Find Contractors</div>
                </a>
             ` : `
                <a href="jobs.html" class="action-card">
                    <div class="action-icon"><i data-lucide="briefcase"></i></div>
                    <div class="action-label">Browse Jobs</div>
                </a>
                <a href="settings.html" class="action-card">
                     <div class="action-icon"><i data-lucide="user-check"></i></div>
                     <div class="action-label">Update Profile</div>
                </a>
             `}
             <a href="messages.html" class="action-card">
                <div class="action-icon"><i data-lucide="message-square"></i></div>
                <div class="action-label">Messages</div>
            </a>
            <a href="settings.html" class="action-card">
                <div class="action-icon"><i data-lucide="settings"></i></div>
                <div class="action-label">Settings</div>
            </a>
        </div>

        <div class="demo-grid" style="grid-template-columns: 2fr 1fr; align-items: start; gap: 2rem;">
            <!-- Recent Activity Feed -->
            <div class="section-card" style="margin-bottom:0">
                <div class="card-header">
                    <div class="card-title">
                        <i data-lucide="activity" style="width:20px"></i> Recent Activity
                    </div>
                </div>
                <!-- Replaced Table with Feed -->
                <div id="activity-feed-container">
                    <div style="padding: 2rem; text-align: center; color: var(--text-secondary);">Loading activity...</div>
                </div>
            </div>

            <!-- Mini Stats Column -->
            <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                <div class="stat-card">
                    <div class="stat-label">Live Jobs</div>
                    <div class="stat-value" id="live-jobs-val">-</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Network Pros</div>
                    <div class="stat-value" id="network-pros-val">-</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Total Bookings</div>
                    <div class="stat-value" id="your-bookings-val">-</div>
                </div>
            </div>
        </div>
    </div>
  `;

  // Poll for data
  fetchbookings();
  lucide.createIcons();
}

async function fetchbookings() {
  try {
    const res = await fetch('/api/bookings?limit=5');
    const bookings = await res.json();
    const container = document.getElementById('activity-feed-container');

    if (!container) return;

    if (bookings.length === 0) {
      container.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-secondary);">No recent activity found. Post a job to get started!</div>';
      return;
    }

    container.className = 'activity-feed'; // Apply feed style wrapper
    container.style.border = 'none'; // distinct from card
    container.style.boxShadow = 'none';

    container.innerHTML = bookings.map(b => `
      <div class="activity-item">
        <div class="activity-meta">
            <div class="activity-icon">
                <i data-lucide="${getIconForTrade(b.trade)}"></i>
            </div>
            <div class="activity-details">
                <h4>${b.trade} Service</h4>
                <span>${b.location} • <span class="badge ${getStatusBadge(b.status)}" style="padding: 0.1rem 0.5rem; font-size: 0.7rem;">${b.status}</span></span>
            </div>
        </div>
        <div class="activity-value">$${b.rate}/hr</div>
      </div>
    `).join('');

    lucide.createIcons();

  } catch (e) {
    console.error(e);
  }
}

function getIconForTrade(trade) {
  const t = (trade || '').toLowerCase();
  if (t.includes('plumb')) return 'droplet';
  if (t.includes('electr')) return 'zap';
  if (t.includes('hvac')) return 'thermometer';
  if (t.includes('carpen')) return 'hammer';
  return 'wrench';
}

function getStatusBadge(status) {
  if (status === 'confirmed') return 'badge-success';
  if (status === 'pending') return 'badge-warning';
  return 'badge-neutral';
}
