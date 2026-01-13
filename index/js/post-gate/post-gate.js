import { initPostFlow } from "./post-flow.js";
import { initPostMedia } from "./post-media.js";
import { initPostSubmit } from "./post-submit.js";
import { initTemplateLoader } from "./post-templates.js";

let started = false;

export function initPostGate() {
  if (started) return;
  started = true;

  initTemplateLoader();   // ⭐ NEW
  initPostFlow();
  initPostMedia();
  initPostSubmit();
}
