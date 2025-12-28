// views/customer-dashboard.js
import { getFirebase } from '/index/js/firebase/init.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection, query, where, getDocs,
  doc, getDoc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  ref, deleteObject, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

let auth, db, storage;

const PLACEHOLDER_AVATAR = "/index/images/noImage.webp";
const PLACEHOLDER_POST = "/index/images/image-webholder.webp";

const $ = id => document.getElementById(id);
const show = el => el && (el.style.display = "block");
const hide = el => el && (el.style.display = "none");

/* ==========================
   SPA INIT
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

  await loadProfile(uid);
  setupAvatar(uid);
  setupAreaAutocomplete();
  await loadPosts(uid);
  setupActions(uid);
  autoDeleteExpiredPosts(uid);
}

/* ==========================
   PROFILE
========================== */
async function loadProfile(uid) {
  const refDoc = doc(db, "users", uid);
  const snap = await getDoc(refDoc);
  const u = snap.exists() ? snap.data() : {};

  $("headerName").textContent = u.name || "Your account";
  $("headerAreaBadge").textContent = u.area || "Add your area";
  $("headerTagline").textContent =
    u.name ? "Your Rhondda profile is looking tidy" : "Let’s set up your Rhondda profile";

  $("viewName").textContent = u.name || "Add your name";
  $("viewPhone").textContent = u.phone || "Add your phone";
  $("viewArea").textContent = u.area || "Add your area";
  $("viewBio").textContent = u.bio || "Tell locals a bit about yourself.";

  $("profileNameInput").value = u.name || "";
  $("profilePhoneInput").value = u.phone || "";
  $("profileAreaInput").value = u.area || "";
  $("profileBioInput").value = u.bio || "";

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

/* ==========================
   AREA AUTOCOMPLETE
========================== */
function setupAreaAutocomplete() {
  const AREAS = ["Porth","Trealaw","Tonypandy","Penygraig","Llwynypia","Ystrad","Gelli","Ton Pentre","Pentre","Treorchy","Treherbert","Ferndale","Tylorstown","Maerdy","Cymmer","Wattstown","Blaenllechau","Blaencwm","Blaenrhondda","Clydach Vale","Edmondstown","Llwyncelyn","Penrhys","Pontygwaith","Williamstown","Ynyshir","Aberdare","Aberaman","Abercynon","Cwmbach","Hirwaun","Llwydcoed","Mountain Ash","Penrhiwceiber","Pen-y-waun","Rhigos","Cefnpennar","Cwaman","Godreaman","Miskin (Mountain Ash)","New Cardiff","Penderyn","Tyntetown","Ynysboeth","Pontypridd","Beddau","Church Village","Cilfynydd","Glyn-coch","Hawthorn","Llantrisant","Llantwit Fardre","Rhydfelen","Taff's Well","Talbot Green","Tonteg","Treforest","Trehafod","Ynysybwl","Coed-y-cwm","Graig","Hopkinstown","Nantgarw","Trallwng","Upper Boat","Brynna","Llanharan","Llanharry","Pontyclun","Tonyrefail","Tyn-y-nant","Gilfach Goch","Groesfaen","Miskin (Llantrisant)","Mwyndy","Thomastown"];

  const input = $("profileAreaInput");
  const box = $("areaSuggestions");

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

  document.onclick = e => {
    if (!box.contains(e.target) && e.target !== input) hide(box);
  };
}

/* ==========================
   POSTS
========================== */
async function loadPosts(uid) {
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

  await deleteDoc(doc(db, "posts", post.id));
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
   ACTIONS
========================== */
function setupActions(uid) {
  $("userPosts").onclick = async e => {
    const btn = e.target;
    const id = btn.dataset.id;
    if (!id) return;

    if (btn.classList.contains("dash-delete")) {
      if (!confirm("Delete this ad?")) return;
      const snap = await getDoc(doc(db, "posts", id));
      await deletePostAndImages({ id, ...snap.data() });
      loadPosts(uid);
    }

    if (btn.classList.contains("dash-edit")) {
      window.editPostId = id;
      window.openScreen("editPost");
    }
  };

  $("newPostBtn").onclick = () => window.openScreen("post");

  $("logoutBtn").onclick = async () => {
    await signOut(auth);
    window.currentUser = null;
    window.loadView("home");
  };
}
