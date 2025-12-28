console.log("🏠 home.js loaded");

import { initFeed } from "/index/js/feed.js";
import { initUI } from "/index/js/ui.js";

export function init() {
  console.log("🏠 home.init() called");

  initFeed();   // 🔁 MUST run every time home loads
  initUI();     // 🔁 safe to re-run
}
