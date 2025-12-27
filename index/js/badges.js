/* ---------------- SVG BADGES ---------------- */

export const BADGE_SVGS = {
  localPro: `
    <svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#03A9F4"/><path fill="#FFF" d="M16 6l-8 8 8 12 8-12-8-8zm0 4l5 5h-10l5-5z"/></svg>
  `,
  responseKing: `
    <svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#795548"/><path fill="#FFF" d="M22 10s-2-2-4-2-4 2-4 2l-6 12 2 2 12-14zM10 22l-2 2h4l-2-2z"/></svg>
  `,
  ecoFriendly: `
    <svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#009688"/><path fill="#FFF" d="M24 14l-8-8H8v8l8 8 8-8zM12 12a1 1 0 110-2 1 1 0 010 2z"/></svg>
  `,
  verifiedShop: `
    <svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#F44336"/><path fill="#FFF" d="M16 6s-4 4-4 8a4 4 0 008 0c0-4-4-8-4-8zm0 14a2 2 0 110-4 2 2 0 010 4z"/></svg>
  `,
  communitySupporter: `
    <svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#FF9800"/><circle cx="16" cy="16" r="6" fill="#FFF"/><path stroke="#FFF" stroke-width="2" d="M16 4v4m0 16v4M4 16h4m16 0h4m-2.5-9.5l-3 3m-11 11l-3 3m17 0l-3-3m-11-11l-3-3"/></svg>
  `,
  nightOwl: `
    <svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#2C3E50"/><path fill="#F1C40F" d="M21 21.5c-4.7 0-8.5-3.8-8.5-8.5 0-1.8.6-3.4 1.5-4.8-4.1.8-7.2 4.4-7.2 8.8 0 5 4 9 9 9 4.4 0 8-3.1 8.8-7.2-1.4.9-3 1.5-4.8 1.5z"/></svg>
  `,
  earlyBird: `
    <svg viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="14" fill="#FFC107"/><path fill="#FFF" d="M16 7l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z"/></svg>
  `,
  loginChamp: `
    <svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#FF5722"/><path fill="#FFF" d="M16 24l-1.5-1.5C9 18 6 15.3 6 12c0-2.6 2-4.6 4.6-4.6 1.5 0 3 1 3.8 2.2.8-1.2 2.3-2.2 3.8-2.2 2.6 0 4.6 2 4.6 4.6 0 3.3-3 6-8.5 10.5L16 24z"/></svg>
  `,
  bargainHunter: `
    <svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#4CAF50"/><path fill="#FFF" d="M16 8c-6 0-8 6-8 8s4 8 8 8 8-4 8-8-2-8-8-8zm0 13c-3 0-5-2-5-5s2-5 5-5 5 2 5 5-2 5-5 5z"/></svg>
  `,
  trailblazer: `
    <svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#E91E63"/><path fill="#FFF" d="M16 8v8h5"/><circle cx="16" cy="16" r="11" stroke="#FFF" stroke-width="2" fill="none"/></svg>
  `,
  problemSolver: `
    <svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#673AB7"/><path fill="#FFF" d="M16 8l-7 6v10h14V14l-7-6zm0 13a2 2 0 110-4 2 2 0 010 4z"/></svg>
  `,
  loyalMember: `
    <svg viewBox="0 0 32 32"><path d="M4 4v10c0 8 12 14 12 14s12-6 12-14V4H4z" fill="#1A73E8"/><path d="M10 16l4 4 8-8" stroke="#FFF" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
  `
};

/* ---------------- BADGE LOGIC ---------------- */

export function computeBadges(user, stats) {
  return {
    localPro: user.isBusiness && stats.completedJobs >= 5,
    responseKing: user.isBusiness && stats.avgReplyTime < 60,
    ecoFriendly: user.isBusiness && user.ecoCertified,
    verifiedShop: user.isBusiness && user.verified,
    communitySupporter: user.isBusiness && stats.communityEvents >= 1,

    nightOwl: stats.lastActiveHour >= 22,
    earlyBird: stats.lastActiveHour <= 7,
    loginChamp: stats.loginStreak >= 5,
    bargainHunter: stats.freebieClicks >= 10,
    trailblazer: stats.firstInCategory === true,
    problemSolver: stats.helpfulAnswers >= 3,
    loyalMember: stats.accountAgeYears >= 1
  };
}

/* ---------------- RENDER BADGES ---------------- */

export function renderBadges(badgeObject) {
  return `
    <div class="badge-row">
      ${Object.entries(badgeObject)
        .filter(([key, value]) => value)
        .map(([key]) => `
          <div class="badge-pill">
            ${BADGE_SVGS[key]}
            <span class="badge-label">${formatBadgeName(key)}</span>
          </div>
        `)
        .join("")}
    </div>
  `;
}

function formatBadgeName(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, c => c.toUpperCase());
}
