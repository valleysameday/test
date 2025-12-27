import { getFirebase } from '/index/js/firebase/init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, deleteObject, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

let auth, db, storage;

const PLACEHOLDER_AVATAR = "/images/avatar-placeholder.jpg";
const PLACEHOLDER_POST = "/images/post-placeholder.jpg";

const $ = id => document.getElementById(id);
const show = el => el && (el.style.display = "block");
const hide = el => el && (el.style.display = "none");

function waitForDashboard() {
  return new Promise(resolve => {
    const check = () => { if ($("bizHeaderName")) resolve(); else requestAnimationFrame(check); };
    check();
  });
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
  if (avatar) avatar.style.backgroundImage = `url('${d.avatarUrl || PLACEHOLDER_AVATAR}')`;
}

function setupAvatarUpload(uid) {
  const input = $("avatarUploadInput");
  const clickArea = $("bizAvatarClickArea");
  const avatar = $("bizDashboardAvatar");
  if (!input || !clickArea || !avatar) return;

  clickArea.onclick = () => input.click();
  input.onchange = async () => {
    const file = input.files[0]; if (!file) return;
    try {
      const refPath = ref(storage, `avatars/${uid}.jpg`);
      await uploadBytes(refPath, file);
      const url = await getDownloadURL(refPath);
      await updateDoc(doc(db, "businesses", uid), { avatarUrl: url });
      avatar.style.backgroundImage = `url('${url}')`;
    } catch (err) { console.error("Avatar upload failed:", err); avatar.style.backgroundImage = `url('${PLACEHOLDER_AVATAR}')`; }
  };
  avatar.onerror = () => { avatar.style.backgroundImage = `url('${PLACEHOLDER_AVATAR}')`; };
}

function setupProfileEditToggle(uid) {
  const view = $("bizProfileViewMode");
  const edit = $("bizProfileEditMode");

  $("bizToggleEditProfile")?.addEventListener("click", () => { hide(view); show(edit); });
  $("bizCancelEditProfileBtn")?.addEventListener("click", () => { show(view); hide(edit); });
  $("bizSaveProfileBtn")?.addEventListener("click", async () => {
    await updateDoc(doc(db, "businesses", uid), {
      name: $("bizNameInput").value.trim(),
      phone: $("bizPhoneInput").value.trim(),
      area: $("bizAreaInput").value.trim(),
      website: $("bizWebsiteInput").value.trim(),
      bio: $("bizBioInput").value.trim()
    });
    $("bizProfileFeedback").textContent = "✅ Profile updated";
    show(view); hide(edit); loadBusinessProfile(uid);
  });
}

/* ------------------ POSTS ------------------ */
async function deletePostAndImages(post) {
  const urls = [...(post.imageUrl ? [post.imageUrl] : []), ...(post.imageUrls || [])];
  for (const url of urls) {
    try { const path = decodeURIComponent(url.split("/o/")[1].split("?")[0]); await deleteObject(ref(storage, path)); } catch {}
  }
  await deleteDoc(doc(db, "posts", post.id));
}

async function loadBusinessPosts(uid) {
  try {
    const snap = await getDocs(query(collection(db, "posts"), where("businessId", "==", uid)));
    const box = $("bizPosts"); box.innerHTML = "";

    if (snap.empty) {
      box.innerHTML = `<p class="biz-empty-msg">No ads yet.</p>`;
      ["bizStatAdsCount","bizStatTotalViews","bizStatLeads"].forEach(id => $(id).textContent="0");
      return;
    }

    const ads = [];
    snap.forEach(docSnap => ads.push({ id: docSnap.id, ...docSnap.data() }));
    ads.sort((a,b)=>(a.title||"").localeCompare(b.title||""));

    let totalViews=0, totalLeads=0;
    $("bizStatAdsCount").textContent = ads.length;

    ads.forEach(post => {
      totalViews += post.views||0;
      totalLeads += post.leads||0;

      const card = document.createElement("div");
      card.className = "biz-card";

      card.innerHTML = `
        <img src="${post.imageUrl || PLACEHOLDER_POST}" class="biz-card-img" alt="${post.title||"Ad"}" loading="lazy" onerror="this.src='${PLACEHOLDER_POST}'">
        <div class="biz-info"><h3>${post.title||"Untitled Ad"}</h3><p>${post.description||""}</p></div>
        <div class="biz-actions">
          <button class="biz-btn biz-edit">Edit</button>
          <button class="biz-btn biz-repost">Repost</button>
          <button class="biz-btn biz-share">Share</button>
          <button class="biz-btn biz-delete">Delete</button>
        </div>
      `;

      card.querySelector(".biz-delete").onclick = async () => { if(!confirm("Delete this ad?")) return; await deletePostAndImages(post); loadBusinessPosts(uid); };
      card.querySelector(".biz-edit").onclick = () => openEditModal(post);
      card.querySelector(".biz-repost").onclick = () => openRepostModal(post);
      card.querySelector(".biz-share").onclick = () => { alert("Copy link to share: "+window.location.href+"#"+post.id); };

      box.appendChild(card);
    });

    $("bizStatTotalViews").textContent = totalViews;
    $("bizStatLeads").textContent = totalLeads;

  } catch (err) { console.error(err); $("bizPosts").innerHTML=`<p class="biz-empty-msg">Error loading ads.</p>`; }
}

/* ------------------ MODAL ------------------ */
const modal = document.createElement("div");
modal.id="bizModal"; modal.className="biz-modal"; modal.style.display="none";
modal.innerHTML=`<div class="biz-modal-content"><span id="bizModalClose" style="cursor:pointer;font-size:20px">×</span><div id="bizModalBody"></div></div>`;
document.body.appendChild(modal);

const modalBody = $("bizModalBody");
$("bizModalClose").onclick = ()=> hide(modal);

function openEditModal(post){
  modalBody.innerHTML = `
    <h3>Edit Ad</h3>
    <input id="editAdTitle" type="text" value="${post.title||''}" style="width:100%"/>
    <textarea id="editAdDesc" style="width:100%">${post.description||''}</textarea>
    <button id="saveEditAdBtn">Save</button>
  `;
  show(modal);
  $("saveEditAdBtn").onclick = async ()=>{
    await updateDoc(doc(db,"posts",post.id),{title:$("editAdTitle").value, description:$("editAdDesc").value});
    hide(modal); loadBusinessPosts(auth.currentUser.uid);
  };
}

function openRepostModal(post){
  modalBody.innerHTML = `
    <h3>Repost Ad</h3>
    <input id="repostAdTitle" type="text" value="${post.title||''}" style="width:100%"/>
    <textarea id="repostAdDesc" style="width:100%">${post.description||''}</textarea>
    <button id="saveRepostAdBtn">Post</button>
  `;
  show(modal);
  $("saveRepostAdBtn").onclick = async ()=>{
    await addDoc(collection(db,"posts"),{
      businessId: auth.currentUser.uid,
      title:$("repostAdTitle").value,
      description:$("repostAdDesc").value,
      views:0,
      leads:0
    });
    hide(modal); loadBusinessPosts(auth.currentUser.uid);
  };
}

/* ------------------ LOGOUT ------------------ */
function setupLogout() {
  $("bizLogoutBtn")?.addEventListener("click", async () => {
    show($("bizLogoutOverlay")); await signOut(auth);
    setTimeout(()=>location.href="/",800);
  });
}

/* ------------------ INIT ------------------ */
getFirebase().then(fb=>{
  auth=fb.auth; db=fb.db; storage=fb.storage;
  onAuthStateChanged(auth, async user=>{
    if(!user) return;
    await waitForDashboard();
    loadBusinessProfile(user.uid);
    setupAvatarUpload(user.uid);
    setupProfileEditToggle(user.uid);
    setupLogout();
    loadBusinessPosts(user.uid);
  });
});
