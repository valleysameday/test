// views/business-dashboard.js
import { getFirebase } from '/index/js/firebase/init.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection, query, where, getDocs,
  doc, getDoc, updateDoc, deleteDoc, addDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, deleteObject, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

let auth, db, storage;

const PLACEHOLDER_AVATAR = "/index/images/noImage.webp";
const PLACEHOLDER_POST = "/index/images/image-webholder2.webp";

const $ = id => document.getElementById(id);
const show = el => el && (el.style.display = "block");
const hide = el => el && (el.style.display = "none");

/* ==========================
   INIT (SPA SAFE)
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

  await loadBusinessProfile(uid);
  setupAvatarUpload(uid);
  setupProfileEditToggle(uid);
  setupLogout();
  loadBusinessPosts(uid);
}

/* ------------------ PROFILE ------------------ */
async function loadBusinessProfile(uid) {
  const snap = await getDoc(doc(db, "businesses", uid));
  const d = snap.exists() ? snap.data() : {};

  $("bizHeaderName").textContent = d.name || "Your Business";
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

function setupAvatarUpload(uid) {
  const input = $("avatarUploadInput");
  const clickArea = $("bizAvatarClickArea");
  const avatar = $("bizDashboardAvatar");
  if (!input || !clickArea || !avatar) return;

  clickArea.onclick = () => input.click();

  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;

    try {
      const refPath = ref(storage, `avatars/${uid}.jpg`);
      await uploadBytes(refPath, file);
      const url = await getDownloadURL(refPath);
      await updateDoc(doc(db, "businesses", uid), { avatarUrl: url });
      avatar.style.backgroundImage = `url('${url}')`;
    } catch (err) {
      console.error("Avatar upload failed:", err);
      avatar.style.backgroundImage = `url('${PLACEHOLDER_AVATAR}')`;
    }
  };
}

function setupProfileEditToggle(uid) {
  const view = $("bizProfileViewMode");
  const edit = $("bizProfileEditMode");

  $("bizToggleEditProfile")?.onclick = () => { hide(view); show(edit); };
  $("bizCancelEditProfileBtn")?.onclick = () => { show(view); hide(edit); };

  $("bizSaveProfileBtn")?.onclick = async () => {
    await updateDoc(doc(db, "businesses", uid), {
      name: $("bizNameInput").value.trim(),
      phone: $("bizPhoneInput").value.trim(),
      area: $("bizAreaInput").value.trim(),
      website: $("bizWebsiteInput").value.trim(),
      bio: $("bizBioInput").value.trim()
    });

    $("bizProfileFeedback").textContent = "✅ Profile updated";
    show(view); hide(edit);
    loadBusinessProfile(uid);
  };
}

/* ------------------ POSTS ------------------ */
async function loadBusinessPosts(uid) {
  const box = $("bizPosts");
  box.innerHTML = "";

  const snap = await getDocs(
    query(collection(db, "posts"), where("businessId", "==", uid))
  );

  if (snap.empty) {
    box.innerHTML = `<p class="biz-empty-msg">No ads yet.</p>`;
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
      <img src="${post.imageUrl || PLACEHOLDER_POST}" class="biz-card-img">
      <div class="biz-info">
        <h3>${post.title || "Untitled Ad"}</h3>
        <p>${post.description || ""}</p>
      </div>
      <div class="biz-actions">
        <button class="biz-delete">Delete</button>
      </div>
    `;

    card.querySelector(".biz-delete").onclick = async () => {
      if (!confirm("Delete this ad?")) return;
      await deleteDoc(doc(db, "posts", post.id));
      loadBusinessPosts(uid);
    };

    box.appendChild(card);
  });

  $("bizStatAdsCount").textContent = snap.size;
  $("bizStatTotalViews").textContent = views;
  $("bizStatLeads").textContent = leads;
}

/* ------------------ LOGOUT ------------------ */
function setupLogout() {
  $("bizLogoutBtn")?.onclick = async () => {
    await signOut(auth);
    window.currentUser = null;
    window.currentAccountType = null;
    window.loadView("home");
  };
}
