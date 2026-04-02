/**
 * Motivational quotes for weekly prospecting updates
 * Short, punchy quotes about sales, hustle, and teamwork
 */
export const MOTIVATIONAL_QUOTES = [
  "The pipeline doesn't fill itself.",
  "Consistency beats talent when talent doesn't show up.",
  "Small daily improvements compound into massive results.",
  "Outwork the competition while they're still planning.",
  "Every no gets you closer to a yes.",
  "Your network is your net worth — keep building.",
  "Success is the sum of small efforts repeated daily.",
  "The best time to prospect was yesterday. The second best is now.",
  "Discipline is doing what needs to be done, even when you don't feel like it.",
  "You don't have to be great to start, but you have to start to be great.",
  "The harder you work, the luckier you get.",
  "Champions are made when no one is watching.",
  "Your future self will thank you for the calls you make today.",
  "Momentum is built one conversation at a time.",
  "The only way to predict the future is to create it.",
  "Average effort produces average results. Choose excellence.",
  "The difference between ordinary and extraordinary is that little extra.",
  "Don't wait for opportunity. Create it.",
  "Success isn't owned, it's leased. And rent is due every day.",
  "The scoreboard doesn't lie — let's make it count.",
];

/**
 * Returns the current week's motivational quote
 * Rotates weekly based on the number of weeks since epoch
 */
export function getWeeklyQuote(): string {
  const weeksSinceEpoch = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const index = weeksSinceEpoch % MOTIVATIONAL_QUOTES.length;
  return MOTIVATIONAL_QUOTES[index];
}
