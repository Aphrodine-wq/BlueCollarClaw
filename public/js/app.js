document.addEventListener('DOMContentLoaded', async () => {
  // Check for file protocol immediately
  if (window.location.protocol === 'file:') {
    const msg = 'This application must be run via the Node.js server to function correctly.\n\nPlease open http://localhost:3000 in your browser.';
    alert(msg);
    return;
  }

  const container = document.querySelector('.main-content');
  const user = await checkAuth();

  // Highlight active nav item
  const path = window.location.pathname;
  document.querySelectorAll('.nav-item').forEach(el => {
    if (el.getAttribute('href') === path || path.endsWith(el.getAttribute('href'))) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  // Initialize WebSocket connection
  initWebSocket(user?.id);

  if (!user) {
    if (path !== '/' && !path.endsWith('/index.html') && !path.endsWith('/')) {
      window.location.href = 'login.html';
      return;
    }
    renderLandingPage(container);
  } else {
    if (path === '/' || path === '/index.html' || path === '/dashboard.html') {
      renderDashboard(container, user);
    } else if (path.includes('jobs.html')) {
      renderJobsPage();
    } else if (path.includes('contractors.html')) {
      renderContractorsPage();
    } else if (path.includes('messages.html')) {
      renderMessagesPage();
    }
  }
});

// WebSocket connection
let ws = null;
let wsReconnectInterval = null;

function initWebSocket(userId) {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('🔌 WebSocket connected');
    if (wsReconnectInterval) {
      clearInterval(wsReconnectInterval);
      wsReconnectInterval = null;
    }
    
    // Authenticate if user is logged in
    if (userId) {
      ws.send(JSON.stringify({ type: 'auth', userId }));
    }
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleWebSocketMessage(data);
  };
  
  ws.onclose = () => {
    console.log('🔌 WebSocket disconnected');
    // Attempt to reconnect every 5 seconds
    if (!wsReconnectInterval) {
      wsReconnectInterval = setInterval(() => {
        console.log('Attempting to reconnect...');
        initWebSocket(userId);
      }, 5000);
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

function handleWebSocketMessage(data) {
  console.log('📨 WebSocket message:', data);
  
  switch (data.type) {
    case 'connected':
      console.log('Connected with client ID:', data.clientId);
      break;
      
    case 'auth':
      if (data.status === 'ok') {
        console.log('WebSocket authenticated');
      }
      break;
      
    case 'new_job':
      showNotification('New job posted!', `A new ${data.job.trade} job is available.`);
      refreshJobList();
      break;
      
    case 'new_offer':
      showNotification('New offer received!', `Someone offered $${data.offer.rate}/hr for your ${data.job.trade} job.`);
      refreshOffersList();
      break;
      
    case 'booking_created':
      showNotification('Booking confirmed!', `Your ${data.booking.trade} job is now booked.`);
      refreshBookingsList();
      break;
      
    case 'offer_declined':
      refreshOffersList();
      break;
  }
}

function showNotification(title, message) {
  // Check if browser supports notifications
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body: message });
  } else {
    // Show in-app toast notification
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.innerHTML = `
      <div style="position: fixed; top: 20px; right: 20px; background: #2563eb; color: white; 
                  padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                  z-index: 10000; max-width: 400px;">
        <strong>${title}</strong><br>
        ${message}
      </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 5000);
  }
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

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
                <div style="font-weight: 700; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem;"><i data-lucide="shield"></i> Secure</div>
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

        <!-- Pending Offers Section (for homeowners) -->
        ${isHomeowner ? `
        <div class="section-card" style="margin-top: 2rem;">
            <div class="card-header">
                <div class="card-title">
                    <i data-lucide="inbox" style="width:20px"></i> Pending Offers
                </div>
            </div>
            <div id="pending-offers-container">
                <div style="padding: 2rem; text-align: center; color: var(--text-secondary);">Loading offers...</div>
            </div>
        </div>
        ` : ''}
    </div>
  `;

  fetchbookings();
  if (isHomeowner) fetchPendingOffers();
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

    container.className = 'activity-feed';
    container.style.border = 'none';
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

async function fetchPendingOffers() {
  try {
    const res = await fetch('/api/my-offers');
    const data = await res.json();
    const container = document.getElementById('pending-offers-container');
    
    if (!container) return;

    const pendingOffers = data.received?.filter(o => o.status === 'pending') || [];

    if (pendingOffers.length === 0) {
      container.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-secondary);">No pending offers. Post a job to receive offers!</div>';
      return;
    }

    container.innerHTML = pendingOffers.map(o => `
      <div class="offer-item" style="padding: 1rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
        <div>
            <strong>${o.contractor_name}</strong> offered 
            <strong>$${o.rate}/hr</strong> for 
            ${o.trade} in ${o.location}
        </div>
        <div style="display: flex; gap: 0.5rem;">
            <button onclick="acceptOffer('${o.id}')" class="btn btn-primary" style="padding: 0.5rem 1rem;">
                Accept
            </button>
            <button onclick="declineOffer('${o.id}')" class="btn btn-secondary" style="padding: 0.5rem 1rem;">
                Decline
            </button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.error('Error fetching offers:', e);
  }
}

async function acceptOffer(offerId) {
  try {
    const res = await fetch(`/api/offers/${offerId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await res.json();
    
    if (res.ok) {
      showNotification('Success!', 'Offer accepted and booking created.');
      fetchPendingOffers();
      fetchbookings();
    } else {
      alert(data.message || 'Error accepting offer');
    }
  } catch (e) {
    console.error('Error:', e);
    alert('Error accepting offer');
  }
}

async function declineOffer(offerId) {
  try {
    const res = await fetch(`/api/offers/${offerId}/decline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (res.ok) {
      showNotification('Declined', 'Offer declined.');
      fetchPendingOffers();
    } else {
      alert('Error declining offer');
    }
  } catch (e) {
    console.error('Error:', e);
    alert('Error declining offer');
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

function refreshJobList() {
  if (window.location.pathname.includes('jobs.html')) {
    renderJobsPage();
  }
}

function refreshOffersList() {
  fetchPendingOffers();
}

function refreshBookingsList() {
  fetchbookings();
}

// Jobs Page Renderer
async function renderJobsPage() {
  const container = document.querySelector('.main-content');
  if (!container) return;

  try {
    const [requestsRes, offersRes] = await Promise.all([
      fetch('/api/requests'),
      fetch('/api/my-offers')
    ]);
    
    const requests = await requestsRes.json();
    const offersData = await offersRes.json();
    
    const openRequests = requests.filter(r => r.status === 'open');
    const myOffers = offersData.sent || [];
    const receivedOffers = offersData.received || [];

    container.innerHTML = `
      <div class="animate-fade-in">
        <h1 style="margin-bottom: 2rem;">Job Requests & Offers</h1>
        
        <div class="section-card" style="margin-bottom: 2rem;">
            <div class="card-header">
                <div class="card-title">Open Job Requests</div>
                <button onclick="showPostJobModal()" class="btn btn-primary">Post New Job</button>
            </div>
            <div id="requests-list">
                ${openRequests.length === 0 ? 
                  '<div style="padding: 2rem; text-align: center; color: var(--text-secondary);">No open job requests.</div>' :
                  openRequests.map(r => `
                    <div class="request-item" style="padding: 1rem; border-bottom: 1px solid var(--border);">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <strong>${r.trade}</strong> in ${r.location}
                                <div style="color: var(--text-secondary); font-size: 0.875rem;">
                                    ${r.start_date} to ${r.end_date} • $${r.min_rate}-$${r.max_rate}/hr
                                </div>
                            </div>
                            <button onclick="showMakeOfferModal('${r.id}', '${r.trade}')" class="btn btn-primary">
                                Make Offer
                            </button>
                        </div>
                    </div>
                  `).join('')
                }
            </div>
        </div>

        <div class="section-card">
            <div class="card-header">
                <div class="card-title">My Offers</div>
            </div>
            <div id="my-offers-list">
                ${myOffers.length === 0 ? 
                  '<div style="padding: 2rem; text-align: center; color: var(--text-secondary);">You haven\'t made any offers yet.</div>' :
                  myOffers.map(o => `
                    <div class="offer-item" style="padding: 1rem; border-bottom: 1px solid var(--border);">
                        <div style="display: flex; justify-content: space-between;">
                            <div>
                                <strong>${o.trade}</strong> in ${o.location}
                                <div style="color: var(--text-secondary); font-size: 0.875rem;">
                                    $${o.rate}/hr • Status: <span class="badge ${getStatusBadge(o.status)}">${o.status}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                  `).join('')
                }
            </div>
        </div>
      </div>
    `;
    
    lucide.createIcons();
  } catch (e) {
    console.error('Error loading jobs page:', e);
  }
}

function showMakeOfferModal(requestId, trade) {
  const rate = prompt(`Enter your hourly rate for ${trade} job:`);
  if (!rate) return;
  
  fetch(`/api/requests/${requestId}/offers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rate: parseFloat(rate) })
  })
  .then(res => res.json())
  .then(data => {
    if (data.message) {
      showNotification('Success!', 'Your offer has been submitted.');
      renderJobsPage();
    } else {
      alert(data.error || 'Error submitting offer');
    }
  })
  .catch(e => {
    console.error('Error:', e);
    alert('Error submitting offer');
  });
}

function showPostJobModal() {
  const trade = prompt('What trade do you need? (plumber, electrician, etc.)');
  if (!trade) return;
  
  const location = prompt('Where is the job?');
  if (!location) return;
  
  const max_rate = prompt('What is your maximum budget per hour?');
  if (!max_rate) return;
  
  fetch('/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trade,
      location,
      max_rate: parseFloat(max_rate),
      description: `Job posted from web dashboard`
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.job) {
      showNotification('Success!', 'Your job has been posted.');
      renderJobsPage();
    } else {
      alert(data.error || 'Error posting job');
    }
  })
  .catch(e => {
    console.error('Error:', e);
    alert('Error posting job');
  });
}

// Contractors Page Renderer
async function renderContractorsPage() {
  // This would show contractor listings
  console.log('Contractors page loaded');
}

// Messages Page Renderer
async function renderMessagesPage() {
  // This would show messages/conversations
  console.log('Messages page loaded');
}
