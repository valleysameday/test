// ======================================
// EMAIL LOGS MODULE
// ======================================

let emailDb;
let emailAuth;
let emailContainer;

export async function initEmails({ db, auth, container }) {
  emailDb = db;
  emailAuth = auth;
  emailContainer = container;

  console.log("[EMAIL LOGS] init");

  renderEmailLayout();
  loadEmailLogs();
}

// ======================================
// LAYOUT
// ======================================

function renderEmailLayout() {
  emailContainer.innerHTML = `
    <h2 class="panel-title">Email Logs</h2>

    <div id="emailFilters" class="email-filters">
      <button data-filter="all" class="filter-btn active">All</button>
      <button data-filter="sent" class="filter-btn">Sent</button>
      <button data-filter="delivered" class="filter-btn">Delivered</button>
      <button data-filter="opened" class="filter-btn">Opened</button>
      <button data-filter="clicked" class="filter-btn">Clicked</button>
      <button data-filter="failed" class="filter-btn">Failed</button>
      <button data-filter="bounced" class="filter-btn">Bounced</button>
    </div>

    <div id="emailList" class="email-list">
      <div class="loading">Loading email logs...</div>
    </div>
  `;

  bindFilterEvents();
}

// ======================================
// FILTER BUTTONS
// ======================================

function bindFilterEvents() {
  const buttons = emailContainer.querySelectorAll(".filter-btn");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const filter = btn.dataset.filter;
      applyFilter(filter);
    });
  });
}

// ======================================
// LOAD EMAIL LOGS (LIVE LISTENER)
// ======================================

let emailLogs = [];

function loadEmailLogs() {
  emailDb
    .collection("emailLogs")
    .orderBy("createdAt", "desc")
    .limit(200)
    .onSnapshot(snapshot => {
      emailLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      applyFilter("all");
    });
}

// ======================================
// FILTER + RENDER
// ======================================

function applyFilter(filter) {
  let filtered = emailLogs;

  if (filter !== "all") {
    filtered = emailLogs.filter(log => log.status === filter);
  }

  renderEmailList(filtered);
}

// ======================================
// STATUS BADGES
// ======================================

function statusBadge(status) {
  const colors = {
    sending: "gray",
    scheduled: "blue",
    sent: "purple",
    delivered: "green",
    opened: "teal",
    clicked: "orange",
    bounced: "red",
    failed: "red",
    complained: "red"
  };

  const color = colors[status] || "gray";

  return `<span class="email-badge ${color}">${status}</span>`;
}

// ======================================
// RENDER EMAIL LIST
// ======================================

function renderEmailList(logs) {
  const list = emailContainer.querySelector("#emailList");

  if (!logs.length) {
    list.innerHTML = `<div class="empty">No emails found.</div>`;
    return;
  }

  list.innerHTML = logs
    .map(log => {
      const created = log.createdAt?.toDate
        ? log.createdAt.toDate().toLocaleString()
        : "—";

      const delivered = log.deliveredAt
        ? new Date(log.deliveredAt).toLocaleString()
        : "—";

      const opened = log.openedAt
        ? new Date(log.openedAt).toLocaleString()
        : "—";

      const clicked = log.clickedAt
        ? new Date(log.clickedAt).toLocaleString()
        : "—";

      return `
        <div class="email-row">

          <div class="email-main">
            <div class="email-to"><strong>${log.recipient}</strong></div>
            <div class="email-subject">${log.subject || "(no subject)"}</div>
            <div class="email-status">${statusBadge(log.status)}</div>
          </div>

          <div class="email-meta">
            <div><strong>Created:</strong> ${created}</div>
            <div><strong>Delivered:</strong> ${delivered}</div>
            <div><strong>Opened:</strong> ${opened}</div>
            <div><strong>Clicked:</strong> ${clicked}</div>
          </div>

          ${
            log.error
              ? `<div class="email-error"><strong>Error:</strong> ${log.error}</div>`
              : ""
          }

          <div class="email-actions">
            ${
              log.status === "failed" || log.status === "bounced"
                ? `<button class="retry-btn" data-id="${log.id}">Retry</button>`
                : ""
            }
          </div>

        </div>
      `;
    })
    .join("");

  bindRetryButtons();
}

// ======================================
// RETRY BUTTON
// ======================================

function bindRetryButtons() {
  const buttons = emailContainer.querySelectorAll(".retry-btn");

  buttons.forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;

      btn.disabled = true;
      btn.textContent = "Retrying...";

      try {
        await fetch("/.netlify/functions/retryEmail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logId: id })
        });

        btn.textContent = "Retried ✔";

      } catch (err) {
        console.error("Retry error:", err);
        btn.textContent = "Retry Failed";
      }
    });
  });
                                            }
