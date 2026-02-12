// GitHub Analysis Module for Pulse Check
// Analyzes all your repos for activity, issues, PRs, and insights

async function getGitHubAnalysis() {
  const username = process.env.GITHUB_USERNAME || require('./pulse-config.json').github_username;
  
  if (!username || username === 'your-github-username') {
    return '🔧 GitHub analysis unavailable — set GITHUB_USERNAME in pulse-config.json';
  }

  try {
    // Fetch user repos
    const reposRes = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        ...(process.env.GITHUB_TOKEN && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` })
      }
    });

    if (!reposRes.ok) {
      return `⚠️ GitHub API error: ${reposRes.status} ${reposRes.statusText}`;
    }

    const repos = await reposRes.json();

    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    // Activity analysis
    const recentlyUpdated = repos.filter(r => new Date(r.updated_at) > oneDayAgo);
    const activeThisWeek = repos.filter(r => new Date(r.pushed_at) > oneWeekAgo);
    
    // Language breakdown
    const languages = {};
    repos.forEach(r => {
      if (r.language) {
        languages[r.language] = (languages[r.language] || 0) + 1;
      }
    });

    const topLanguages = Object.entries(languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([lang, count]) => `${lang} (${count})`);

    // Stars and forks
    const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
    const totalForks = repos.reduce((sum, r) => sum + r.forks_count, 0);
    
    // Most active repos (by recent push)
    const mostActive = repos
      .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
      .slice(0, 5);

    const parts = [];
    parts.push(`💻 **GITHUB ANALYSIS** (${repos.length} repos)`);

    if (activeThisWeek.length > 0) {
      parts.push(`   🟢 ${activeThisWeek.length} repo${activeThisWeek.length > 1 ? 's' : ''} active this week`);
    }

    if (recentlyUpdated.length > 0) {
      parts.push(`   🔥 ${recentlyUpdated.length} updated in last 24h`);
      recentlyUpdated.slice(0, 3).forEach(r => {
        const timeAgo = getTimeAgo(new Date(r.updated_at));
        parts.push(`      • ${r.name} (${timeAgo})`);
      });
    }

    parts.push(`   ⭐ ${totalStars} stars, 🍴 ${totalForks} forks`);
    
    if (topLanguages.length > 0) {
      parts.push(`   📚 Top languages: ${topLanguages.join(', ')}`);
    }

    // Active repos with context
    if (mostActive.length > 0) {
      parts.push(`\n   **MOST ACTIVE:**`);
      mostActive.slice(0, 3).forEach(r => {
        const lastPush = getTimeAgo(new Date(r.pushed_at));
        const status = r.private ? '🔒' : '🌐';
        parts.push(`      ${status} ${r.name} — ${r.language || 'No language'} (pushed ${lastPush})`);
      });
    }

    // Look for repos with open issues (if token provided)
    if (process.env.GITHUB_TOKEN) {
      const withIssues = repos.filter(r => r.open_issues_count > 0);
      if (withIssues.length > 0) {
        const totalIssues = withIssues.reduce((sum, r) => sum + r.open_issues_count, 0);
        parts.push(`\n   ⚠️ ${totalIssues} open issues across ${withIssues.length} repos`);
      }
    }

    // Stale repos (not updated in 30 days)
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const staleRepos = repos.filter(r => 
      new Date(r.updated_at) < thirtyDaysAgo && 
      !r.archived &&
      new Date(r.created_at) < thirtyDaysAgo // Ignore recently created
    );

    if (staleRepos.length > 3) {
      parts.push(`\n   💤 ${staleRepos.length} repos inactive 30+ days — consider archiving`);
    }

    return parts.join('\n');

  } catch (err) {
    return `⚠️ GitHub analysis failed: ${err.message}`;
  }
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
}

module.exports = { getGitHubAnalysis };
