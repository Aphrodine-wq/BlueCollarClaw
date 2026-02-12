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
