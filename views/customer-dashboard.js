// views/dashboard-hub.js
import { getFirebase } from "/index/js/firebase/init.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection, query, where, getDocs,
  doc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const PLACEHOLDER_AVATAR = "/index/images/noImage.webp";
const PLACEHOLDER_POST = "/index/images/image-webholder.webp";
const PLACEHOLDER_BIZ_POST = "/index/images/image-webholder2.webp";

let auth, db, storage;

const $ = id => document.getElementById(id);
const show = el => el && (el.style.display = "block");
const hide = el => el && (el.style.display = "none");

/* ==========================
   INIT
========================== */
export async function init() {
  if (!window.currentUser) {
    window.loadView("home");
    return;
  }

  const fb = await getFirebase();
  auth = fb.auth;
  db = fb.db;
  storage = fb.storage;

  const uid = window.currentUser.uid;

  const userDocRef = doc(db, "users", uid);
  const userSnap = await getDoc(userDocRef);
  const userData = userSnap.exists() ? userSnap.data() : {};

  const plan = userData.plan || "free"; // "classic", "free", "sellerplus", "business"
  const businessTrial = userData.businessTrial || null;
  const sellerTrial = userData.sellerTrial || null;

  setupHeader(userData, plan, businessTrial, sellerTrial);
  setupTabs(plan);
  setupLogout();
  setupUpgradeModal(uid, userDocRef, userData);

  await loadProfile(uid, userData);
  setupAvatar(uid);
  setupAreaAutocomplete();
  setupProfileEdit(uid, userDocRef);

  await loadUserPosts(uid);
  autoDeleteExpiredPosts(uid);

  if (plan === "business") {
    await loadBusinessProfile(uid);
    setupBusinessAvatar(uid);
    setupBusinessProfileEdit(uid);
    await loadBusinessPosts(uid);
  }
}

/* ==========================
   HEADER & PLAN
========================== */
function setupHeader(userData, plan, businessTrial, sellerTrial) {
  const name = userData.name || null;
  const area = userData.area || "Add your area";

  $("dashGreeting").textContent = `Shwmae, ${name || "friend"}`;
  $("dashTitle").textContent = name ? "Your Dashboard" : "Welcome to RCT‑X";

  if (plan === "business") {
    $("dashHeader").classList.add("business");
    $("dashTagline").textContent = "Your business hub is ready to go";
  } else if (name) {
    $("dashTagline").textContent = "Your RCT‑X profile is looking tidy";
  } else {
    $("dashTagline").textContent = "Let’s get your Rhondda profile looking tidy";
  }

  $("headerAreaBadge").textContent = area;

  const planBadge = $("planBadge");
  planBadge.className = "plan-badge " + plan;
  planBadge.textContent =
    plan === "sellerplus" ? "Seller+ Member" :
    plan === "business" ? "Business Member" :
    plan === "classic" ? "Classic Member" :
    "Free Forever";

  const trialBadge = $("trialBadge");
  let trial = null;

  if (plan === "business" && businessTrial && businessTrial.active) {
    trial = businessTrial;
  } else if (plan === "sellerplus" && sellerTrial && sellerTrial.active) {
    trial = sellerTrial;
  }

  if (!trial || !trial.active) {
    hide(trialBadge);
    $("settingsTrialLabel").textContent = "No active trial";
  } else {
    const daysLeft = Math.max(
      0,
      Math.ceil((trial.expiresAt - Date.now()) / (1000 * 60 * 60 * 24))
    );
    trialBadge.textContent = `${daysLeft} days left (${plan === "business" ? "Business" : "Seller+"} Trial)`;
    show(trialBadge);
    $("settingsTrialLabel").textContent = `${daysLeft} days left on your ${plan === "business" ? "Business" : "Seller+"} trial`;
  }

  $("settingsPlanLabel").textContent = planBadge.textContent;
}

/* ==========================
   TABS
========================== */
function setupTabs(plan) {
  const tabs = document.querySelectorAll(".top-nav-item");
  const views = {
    overviewTab: $("overviewTab"),
    adsTab: $("adsTab"),
    sellerPlusTab: $("sellerPlusTab"),
    businessTab: $("businessTab"),
    settingsTab: $("settingsTab")
  };

  if (plan === "sellerplus") {
    show($("sellerPlusTabBtn"));
  } else {
    hide($("sellerPlusTabBtn"));
  }

  if (plan === "business") {
    show($("businessTabBtn"));
  } else {
    hide($("businessTabBtn"));
  }

  tabs.forEach(btn => {
    btn.onclick = () => {
      tabs.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const tabId = btn.dataset.tab;
      Object.keys(views).forEach(id => {
        views[id].style.display = id === tabId ? "block" : "none";
      });
    };
  });
}

/* ==========================
   LOGOUT
========================== */
function setupLogout() {
  $("logoutBtn").onclick = async () => {
    show($("logoutOverlay"));
    await signOut(auth);
    window.currentUser = null;
    window.currentAccountType = null;
    window.loadView("home");
  };
}

/* ==========================
   PROFILE
========================== */
async function loadProfile(uid, userData) {
  const u = userData;

  $("viewName").textContent = u.name || "Add your name";
  $("viewPhone").textContent = u.phone || "Add your phone";
  $("viewArea").textContent = u.area || "Add your area";
  $("viewBio").textContent = u.bio || "Tell locals a bit about yourself.";

  $("profileNameInput").value = u.name || "";
  $("profilePhoneInput").value = u.phone || "";
  $("profileAreaInput").value = u.area || "";
  $("profileBioInput").value = u.bio || "";

  $("settingsNameInput").value = u.name || "";
  $("settingsAreaInput").value = u.area || "";
  $("settingsBioInput").value = u.bio || "";

  $("dashboardAvatar").style.backgroundImage =
    `url('${u.avatarUrl || PLACEHOLDER_AVATAR}')`;
}

function setupAvatar(uid) {
  const input = $("avatarUploadInput");
  const click = $("avatarClickArea");
  const avatar = $("dashboardAvatar");
  if (!input || !click || !avatar) return;

  click.onclick = () => input.click();

  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;

    const refPath = ref(storage, `avatars/${uid}.jpg`);
    await uploadBytes(refPath, file);
    const url = await getDownloadURL(refPath);
    await updateDoc(doc(db, "users", uid), { avatarUrl: url });
    avatar.style.backgroundImage = `url('${url}')`;
  };
}

function setupProfileEdit(uid, userDocRef) {
  const view = $("profileViewMode");
  const edit = $("profileEditMode");

  $("toggleEditProfile").onclick = () => { hide(view); show(edit); };
  $("cancelEditProfileBtn").onclick = () => { show(view); hide(edit); };

  $("saveProfileBtn").onclick = async () => {
    const name = $("profileNameInput").value.trim();
    const phone = $("profilePhoneInput").value.trim();
    const area = $("profileAreaInput").value.trim();
    const bio = $("profileBioInput").value.trim();

    await updateDoc(userDocRef, { name, phone, area, bio });

    $("profileFeedback").textContent = "✅ Profile updated";
    $("profileFeedback").className = "feedback-text feedback-success";

    $("viewName").textContent = name || "Add your name";
    $("viewPhone").textContent = phone || "Add your phone";
    $("viewArea").textContent = area || "Add your area";
    $("viewBio").textContent = bio || "Tell locals a bit about yourself.";

    $("settingsNameInput").value = name;
    $("settingsAreaInput").value = area;
    $("settingsBioInput").value = bio;

    show(view); hide(edit);
  };

  $("settingsSaveProfileBtn").onclick = async () => {
    const name = $("settingsNameInput").value.trim();
    const area = $("settingsAreaInput").value.trim();
    const bio = $("settingsBioInput").value.trim();

    await updateDoc(userDocRef, { name, area, bio });

    $("viewName").textContent = name || "Add your name";
    $("viewArea").textContent = area || "Add your area";
    $("viewBio").textContent = bio || "Tell locals a bit about yourself.";

    $("profileFeedback").textContent = "✅ Profile updated";
    $("profileFeedback").className = "feedback-text feedback-success";
  };
}

/* ==========================
   AREA AUTOCOMPLETE
========================== */
function setupAreaAutocomplete() {
  const AREAS = ["Porth","Trealaw","Tonypandy","Penygraig","Llwynypia","Ystrad","Gelli","Ton Pentre","Pentre","Treorchy","Treherbert","Ferndale","Tylorstown","Maerdy","Cymmer","Wattstown","Blaenllechau","Blaencwm","Blaenrhondda","Clydach Vale","Edmondstown","Llwyncelyn","Penrhys","Pontygwaith","Williamstown","Ynyshir","Aberdare","Aberaman","Abercynon","Cwmbach","Hirwaun","Llwydcoed","Mountain Ash","Penrhiwceiber","Pen-y-waun","Rhigos","Cefnpennar","Cwaman","Godreaman","Miskin (Mountain Ash)","New Cardiff","Penderyn","Tyntetown","Ynysboeth","Pontypridd","Beddau","Church Village","Cilfynydd","Glyn-coch","Hawthorn","Llantrisant","Llantwit Fardre","Rhydfelen","Taff's Well","Talbot Green","Tonteg","Treforest","Trehafod","Ynysybwl","Coed-y-cwm","Graig","Hopkinstown","Nantgarw","Trallwng","Upper Boat","Brynna","Llanharan","Llanharry","Pontyclun","Tonyrefail","Tyn-y-nant","Gilfach Goch","Groesfaen","Miskin (Llantrisant)","Mwyndy","Thomastown"];

  const input = $("profileAreaInput");
  const box = $("areaSuggestions");

  if (!input || !box) return;

  input.oninput = () => {
    const v = input.value.toLowerCase();
    box.innerHTML = "";
    if (!v) return hide(box);

    AREAS.filter(a => a.toLowerCase().startsWith(v)).forEach(a => {
      const d = document.createElement("div");
      d.className = "suggestion-item";
      d.textContent = a;
      d.onclick = () => { input.value = a; hide(box); };
      box.appendChild(d);
    });

    show(box);
  };

  document.addEventListener("click", e => {
    if (!box.contains(e.target) && e.target !== input) hide(box);
  });
}

/* ==========================
   USER POSTS
========================== */
async function loadUserPosts(uid) {
  const box = $("userPosts");
  box.innerHTML = "";

  const snap = await getDocs(
    query(collection(db, "posts"), where("userId", "==", uid))
  );

  let ads = 0, views = 0, unlocks = 0;

  if (snap.empty) {
    box.innerHTML = `<p class="empty-msg">You haven’t posted anything yet.</p>`;
  }

  snap.forEach(d => {
    const p = { id: d.id, ...d.data() };
    ads++;
    views += p.views || 0;
    unlocks += p.unlocks || 0;

    const card = document.createElement("div");
    card.className = "dash-card";
    card.innerHTML = `
      <img src="${p.imageUrl || PLACEHOLDER_POST}" class="dash-img">
      <div class="dash-info">
        <h3>${p.title || "Untitled"}</h3>
        <p>${p.description || ""}</p>
      </div>
      <div class="dash-actions">
        <button class="dash-btn dash-edit" data-id="${p.id}">Edit</button>
        <button class="dash-btn dash-delete" data-id="${p.id}">Delete</button>
      </div>
    `;
    box.appendChild(card);
  });

  $("statAdsCount").textContent = ads;
  $("statTotalViews").textContent = views;
  $("statUnlocks").textContent = unlocks;

  box.onclick = async e => {
    const btn = e.target;
    const id = btn.dataset.id;
    if (!id) return;

    if (btn.classList.contains("dash-delete")) {
      if (!confirm("Delete this ad?")) return;
      const snap = await getDoc(doc(db, "posts", id));
      await deletePostAndImages({ id, ...snap.data() });
      loadUserPosts(uid);
    }

    if (btn.classList.contains("dash-edit")) {
      window.editPostId = id;
      window.openScreen("editPost");
    }
  };

  $("newPostBtn").onclick = () => window.openScreen("post");
}

/* ==========================
   DELETE POSTS + IMAGES
========================== */
async function deletePostAndImages(post) {
  const urls = [];
  if (post.imageUrl) urls.push(post.imageUrl);
  if (Array.isArray(post.imageUrls)) urls.push(...post.imageUrls);

  for (const url of urls) {
    try {
      const path = decodeURIComponent(url.split("/o/")[1].split("?")[0]);
      await deleteObject(ref(storage, path));
    } catch {}
  }

  await updateDoc(doc(db, "posts", post.id), { deleted: true }).catch(async () => {
    await deleteDoc(doc(db, "posts", post.id));
  });
}

/* ==========================
   AUTO DELETE OLD POSTS
========================== */
async function autoDeleteExpiredPosts(uid) {
  const now = Date.now();
  const limit = 14 * 86400000;

  const snap = await getDocs(
    query(collection(db, "posts"), where("userId", "==", uid))
  );

  snap.forEach(d => {
    const p = d.data();
    if (p.createdAt && now - p.createdAt.toMillis() > limit) {
      deletePostAndImages({ id: d.id, ...p });
    }
  });
}

/* ==========================
   BUSINESS PROFILE
========================== */
async function loadBusinessProfile(uid) {
  const snap = await getDoc(doc(db, "businesses", uid));
  const d = snap.exists() ? d = snap.data() : {};

  $("bizViewName").textContent = d.name || "Add your business name";
  $("bizViewPhone").textContent = d.phone || "Add your phone";
  $("bizViewArea").textContent = d.area || "Add your area";
  $("bizViewWebsite").textContent = d.website || "Add your website";
  $("bizViewBio").textContent = d.bio || "Tell customers what you offer";

  $("bizNameInput").value = d.name || "";
  $("bizPhoneInput").value = d.phone || "";
  $("bizAreaInput").value = d.area || "";
  $("bizWebsiteInput").value = d.website || "";
  $("bizBioInput").value = d.bio || "";

  const avatar = $("bizDashboardAvatar");
  if (avatar) {
    avatar.style.backgroundImage = `url('${d.avatarUrl || PLACEHOLDER_AVATAR}')`;
  }
}

function setupBusinessAvatar(uid) {
  const input = $("avatarUploadInput");
  const clickArea = $("bizAvatarClickArea");
  const avatar = $("bizDashboardAvatar");
  if (!input || !clickArea || !avatar) return;

  clickArea.onclick = () => input.click();

  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;

    try {
      const refPath = ref(storage, `business-avatars/${uid}.jpg`);
      await uploadBytes(refPath, file);
      const url = await getDownloadURL(refPath);
      await updateDoc(doc(db, "businesses", uid), { avatarUrl: url });
      avatar.style.backgroundImage = `url('${url}')`;
    } catch (err) {
      console.error("Business avatar upload failed:", err);
      avatar.style.backgroundImage = `url('${PLACEHOLDER_AVATAR}')`;
    }
  };
}

function setupBusinessProfileEdit(uid) {
  const view = $("bizProfileViewMode");
  const edit = $("bizProfileEditMode");

  $("bizToggleEditProfile").onclick = () => { hide(view); show(edit); };
  $("bizCancelEditProfileBtn").onclick = () => { show(view); hide(edit); };

  $("bizSaveProfileBtn").onclick = async () => {
    await updateDoc(doc(db, "businesses", uid), {
      name: $("bizNameInput").value.trim(),
      phone: $("bizPhoneInput").value.trim(),
      area: $("bizAreaInput").value.trim(),
      website: $("bizWebsiteInput").value.trim(),
      bio: $("bizBioInput").value.trim()
    });

    $("bizProfileFeedback").textContent = "✅ Business profile updated";
    await loadBusinessProfile(uid);
    show(view); hide(edit);
  };
}

/* ==========================
   BUSINESS POSTS
========================== */
async function loadBusinessPosts(uid) {
  const box = $("bizPosts");
  box.innerHTML = "";

  const snap = await getDocs(
    query(collection(db, "posts"), where("businessId", "==", uid))
  );

  if (snap.empty) {
    box.innerHTML = `<p class="biz-empty-msg">No business ads yet.</p>`;
    $("bizStatAdsCount").textContent = "0";
    $("bizStatTotalViews").textContent = "0";
    $("bizStatLeads").textContent = "0";
    return;
  }

  let views = 0, leads = 0;

  snap.forEach(docSnap => {
    const post = { id: docSnap.id, ...docSnap.data() };
    views += post.views || 0;
    leads += post.leads || 0;

    const card = document.createElement("div");
    card.className = "biz-card";
    card.innerHTML = `
      <img src="${post.imageUrl || PLACEHOLDER_BIZ_POST}" class="biz-card-img">
      <div class="biz-info">
        <h3>${post.title || "Untitled Ad"}</h3>
        <p>${post.description || ""}</p>
      </div>
      <div class="biz-actions">
        <button class="biz-btn biz-delete">Delete</button>
      </div>
    `;

    card.querySelector(".biz-delete").onclick = async () => {
      if (!confirm("Delete this ad?")) return;
      await updateDoc(doc(db, "posts", post.id), { deleted: true }).catch(async () => {
        await deleteDoc(doc(db, "posts", post.id));
      });
      loadBusinessPosts(uid);
    };

    box.appendChild(card);
  });

  $("bizStatAdsCount").textContent = snap.size;
  $("bizStatTotalViews").textContent = views;
  $("bizStatLeads").textContent = leads;

  $("bizNewPostBtn").onclick = () => {
    window.openScreen("post"); // or a dedicated business-post screen if you add one
  };
}

/* ==========================
   UPGRADE MODAL & PLAN LOGIC
========================== */
function setupUpgradeModal(uid, userDocRef, userData) {
  const overlay = $("upgradeModalOverlay");
  const openBtn = $("openUpgradeModalBtn");
  const settingsBtn = $("settingsChangePlanBtn");
  const closeBtn = $("closeUpgradeModalBtn");

  const planButtons = document.querySelectorAll(".plan-btn");

  const open = () => show(overlay);
  const close = () => hide(overlay);

  if (openBtn) openBtn.onclick = open;
  if (settingsBtn) settingsBtn.onclick = open;
  if (closeBtn) closeBtn.onclick = close;

  overlay.addEventListener("click", e => {
    if (e.target === overlay) close();
  });

  planButtons.forEach(btn => {
    btn.onclick = async () => {
      const plan = btn.dataset.plan; // "free", "sellerplus", "business"

      if (plan === "free") {
        await updateDoc(userDocRef, {
          plan: "free",
          businessTrial: null,
          sellerTrial: null
        });
      }

      if (plan === "sellerplus") {
        const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
        await updateDoc(userDocRef, {
          plan: "sellerplus",
          sellerTrial: { active: true, expiresAt },
          businessTrial: userData.businessTrial || null
        });
      }

      if (plan === "business") {
        const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
        await updateDoc(userDocRef, {
          plan: "business",
          businessTrial: { active: true, expiresAt },
          sellerTrial: userData.sellerTrial || null
        });
      }

      window.loadView("dashboard"); // reload SPA view to refresh state
    };
  });
      }
