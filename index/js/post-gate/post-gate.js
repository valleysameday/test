import { initPostFlow } from "./post-flow.js";
import { initPostMedia } from "./post-media.js";
import { initPostSubmit } from "./post-submit.js";

let started = false;

export function initPostGate() {
  if (started) return;
  started = true;

  initPostFlow();
  initPostMedia();
  initPostSubmit();
}
