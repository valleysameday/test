const RCT_POSTCODES = [
  "CF15","CF35","CF37","CF38","CF39",
  "CF40","CF41","CF42","CF43","CF44","CF45","CF72"
];

let currentStep = 0;

export function initPostFlow() {
  const steps = document.querySelectorAll(".post-step");
  const nextBtns = document.querySelectorAll(".post-next");
  const prevBtns = document.querySelectorAll(".post-prev");

  function showStep(step) {
    steps.forEach(s => {
      s.style.display =
        Number(s.dataset.step) === step ? "block" : "none";
    });
    currentStep = step;
  }

  nextBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      if (currentStep === 0) {
        const pc = document.getElementById("postPostcode")?.value || "";
        const outward = pc.toUpperCase().slice(0,4);
        if (!RCT_POSTCODES.includes(outward)) {
          document.getElementById("rhondda-warning")?.classList.remove("hidden");
          return;
        }
        sessionStorage.setItem("rhonddaThanksShown","true");
      }
      showStep(currentStep + 1);
    });
  });

  prevBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      showStep(Math.max(0, currentStep - 1));
    });
  });

  const skipPostcode =
    window.currentUser || sessionStorage.getItem("rhonddaThanksShown");

  showStep(skipPostcode ? 1 : 0);
}
