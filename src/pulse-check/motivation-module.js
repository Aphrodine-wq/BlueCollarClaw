// Motivation Module for Pulse Check
// Daily motivational messages tailored to builders and hustlers

function getMotivation() {
  const motivations = [
    {
      quote: "Every empire was built one brick at a time.",
      action: "Focus on today's brick. Stack it perfect.",
      emoji: "🧱"
    },
    {
      quote: "The market doesn't reward potential. It rewards execution.",
      action: "Ship something today. Even if it's small.",
      emoji: "🚀"
    },
    {
      quote: "Your competition is sleeping. You're not.",
      action: "Use this edge. Make it count.",
      emoji: "⚡"
    },
    {
      quote: "Code doesn't care about your mood. It cares about your commitment.",
      action: "Show up. Write. Deploy. Repeat.",
      emoji: "💻"
    },
    {
      quote: "Every successful founder has a graveyard of failed projects.",
      action: "Your failures are funding your future success.",
      emoji: "💀"
    },
    {
      quote: "The best time to start was yesterday. The second best is now.",
      action: "What are you waiting for?",
      emoji: "⏰"
    },
    {
      quote: "You're not building a product. You're building proof you can execute.",
      action: "Show them what you're made of.",
      emoji: "🔥"
    },
    {
      quote: "The difference between you and them? You actually ship.",
      action: "Keep that energy. They'll notice.",
      emoji: "📦"
    },
    {
      quote: "Nobody's coming to save your startup. That's on you.",
      action: "Take ownership. Make decisions. Move forward.",
      emoji: "👑"
    },
    {
      quote: "Your GitHub contributions don't lie. Make today green.",
      action: "Commit something meaningful.",
      emoji: "🟢"
    },
    {
      quote: "The market rewards speed and iteration, not perfection.",
      action: "Launch the MVP. Get feedback. Iterate.",
      emoji: "🎯"
    },
    {
      quote: "Every line of code you write is a vote for the future you want.",
      action: "Make it count.",
      emoji: "🗳️"
    },
    {
      quote: "Mediocre builders make excuses. Great builders make progress.",
      action: "Which one are you today?",
      emoji: "🏗️"
    },
    {
      quote: "Your network is watching. Show them you're serious.",
      action: "Do something worth talking about.",
      emoji: "👀"
    },
    {
      quote: "The hardest part of building is starting. You already did that.",
      action: "Now keep the momentum. Don't stop.",
      emoji: "🌊"
    },
    {
      quote: "Your competitors are counting on you to give up.",
      action: "Disappoint them.",
      emoji: "😤"
    },
    {
      quote: "Ideas are cheap. Execution is priceless.",
      action: "Execute today.",
      emoji: "💎"
    },
    {
      quote: "Every successful builder has imposter syndrome. Build anyway.",
      action: "You know more than you think you do.",
      emoji: "🎭"
    },
    {
      quote: "The grind isn't glamorous. But the results are.",
      action: "Put in the work. Future you will thank you.",
      emoji: "💪"
    },
    {
      quote: "You're not just building software. You're building a lifestyle.",
      action: "Make today contribute to the life you want.",
      emoji: "🏡"
    }
  ];

  // Pick based on day of year (consistent but rotates)
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
  const selected = motivations[dayOfYear % motivations.length];

  const parts = [];
  parts.push(`${selected.emoji} **DAILY MOTIVATION**`);
  parts.push(`   "${selected.quote}"`);
  parts.push(`   → ${selected.action}`);

  return parts.join('\n');
}

// Get weekly wisdom (Friday only)
function getWeeklyWisdom() {
  const today = new Date();
  if (today.getDay() !== 5) return null; // Only Fridays

  // Calculate day of year
  const start = new Date(today.getFullYear(), 0, 0);
  const diff = today - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const wisdom = [
    "This week you learned something new. Next week, teach it to someone.",
    "You shipped code this week. That's more than most people ever will.",
    "The repos you touched this week are proof you're serious.",
    "This week had setbacks. Next week has opportunities. Choose wisely.",
    "You're 52 weeks away from where you want to be. Make each one count.",
    "This week's commits are tomorrow's resume. Keep stacking.",
    "The work you did this week compounds. Trust the process."
  ];

  const weekOfYear = Math.floor(dayOfYear / 7);
  const selected = wisdom[weekOfYear % wisdom.length];

  return `\n📖 **WEEKLY WISDOM**\n   ${selected}`;
}

module.exports = { getMotivation, getWeeklyWisdom };
