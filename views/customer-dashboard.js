import { getFirebase } from '/index/js/firebase/init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, deleteObject, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

let auth, db, storage;

const PLACEHOLDER_AVATAR = "/index/images/noImage.webp";
const PLACEHOLDER_POST = "/index/images/image-webholder.webp";

/* ---------------------------------------------------
   ✅ DELETE POST + IMAGES
--------------------------------------------------- */
async function deletePostAndImages(post) {
  try {
    const allImages = [];

    if (post.imageUrl) allImages.push(post.imageUrl);
    if (Array.isArray(post.imageUrls)) allImages.push(...post.imageUrls);

    for (const url of allImages) {
      try {
        const path = url.split("/o/")[1].split("?")[0];
        const storageRef = ref(storage, decodeURIComponent(path));
        await deleteObject(storageRef);
      } catch (e) {
        console.warn("Image deletion skipped:", url);
      }
    }

    await deleteDoc(doc(db, "posts", post.id));
    console.log("✅ Deleted post + images:", post.id);

  } catch (err) {
    console.error("❌ Failed to delete post:", err);
  }
}

/* ---------------------------------------------------
   ✅ AUTO DELETE POSTS OLDER THAN 14 DAYS
--------------------------------------------------- */
async function autoDeleteExpiredPosts(userId) {
  const now = Date.now();
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  const q = query(collection(db, "posts"), where("userId", "==", userId));
  const snap = await getDocs(q);

  snap.forEach(async docSnap => {
    const post = { id: docSnap.id, ...docSnap.data() };
    if (!post.createdAt) return;
    const age = now - post.createdAt.toMillis();
    if (age > fourteenDays) await deletePostAndImages(post);
  });
}

/* ---------------------------------------------------
   ✅ MAIN DASHBOARD LOGIC
--------------------------------------------------- */
getFirebase().then(fb => {
  auth = fb.auth;
  db = fb.db;
  storage = fb.storage;

  onAuthStateChanged(auth, async user => {
    if (!user) {
      loadView("home");
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    let name = "", phone = "", area = "", bio = "", avatarUrl = "";

    if (snap.exists()) {
      const u = snap.data();
      name = u.name || "";
      phone = u.phone || "";
      area = u.area || "";
      bio = u.bio || "";
      avatarUrl = u.avatarUrl || "";
    }

    // ---------- Update header + profile ----------
    document.getElementById("headerName").textContent = name || "Your account";
    document.getElementById("headerAreaBadge").textContent = area || "Add your area";
    document.getElementById("headerTagline").textContent =
      name ? "Your Rhondda profile is looking tidy" : "Let’s set up your Rhondda profile";

    document.getElementById("viewName").textContent = name || "Add your name";
    document.getElementById("viewPhone").textContent = phone || "Add your phone";
    document.getElementById("viewArea").textContent = area || "Add your area";
    document.getElementById("viewBio").textContent = bio || "Tell locals a bit about yourself.";

    document.getElementById("profileNameInput").value = name;
    document.getElementById("profilePhoneInput").value = phone;
    document.getElementById("profileAreaInput").value = area;
    document.getElementById("profileBioInput").value = bio;

    // ---------- Avatar Handling ----------
    const avatarInput = document.getElementById("avatarUploadInput");
    const avatarCircle = document.getElementById("dashboardAvatar");
    const avatarClickArea = document.getElementById("avatarClickArea");

    avatarCircle.style.backgroundImage = `url('${avatarUrl || PLACEHOLDER_AVATAR}')`;

    avatarClickArea.addEventListener("click", () => avatarInput.click());

    avatarInput.addEventListener("change", async () => {
      const file = avatarInput.files[0];
      if (!file) return;

      const storageRef = ref(storage, `avatars/${user.uid}.jpg`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await updateDoc(userRef, { avatarUrl: url });
      avatarCircle.style.backgroundImage = `url('${url}')`;
    });

    // ---------- Area autocomplete ----------
    const AREAS = ["Porth","Trealaw","Tonypandy","Penygraig","Llwynypia","Ystrad","Gelli","Ton Pentre","Pentre","Treorchy","Treherbert","Ferndale","Tylorstown","Maerdy","Cymmer","Wattstown","Blaenllechau","Blaencwm","Blaenrhondda","Clydach Vale","Edmondstown","Llwyncelyn","Penrhys","Pontygwaith","Williamstown","Ynyshir","Aberdare","Aberaman","Abercynon","Cwmbach","Hirwaun","Llwydcoed","Mountain Ash","Penrhiwceiber","Pen-y-waun","Rhigos","Cefnpennar","Cwaman","Godreaman","Miskin (Mountain Ash)","New Cardiff","Penderyn","Tyntetown","Ynysboeth","Pontypridd","Beddau","Church Village","Cilfynydd","Glyn-coch","Hawthorn","Llantrisant","Llantwit Fardre","Rhydfelen","Taff's Well","Talbot Green","Tonteg","Treforest","Trehafod","Ynysybwl","Coed-y-cwm","Graig","Hopkinstown","Nantgarw","Trallwng","Upper Boat","Brynna","Llanharan","Llanharry","Pontyclun","Tonyrefail","Tyn-y-nant","Gilfach Goch","Groesfaen","Miskin (Llantrisant)","Mwyndy","Thomastown"];

    const areaInput = document.getElementById("profileAreaInput");
    const suggestionBox = document.getElementById("areaSuggestions");

    areaInput.addEventListener("input", () => {
      const value = areaInput.value.toLowerCase();
      suggestionBox.innerHTML = "";
      if (!value) return suggestionBox.style.display = "none";

      const matches = AREAS.filter(a => a.toLowerCase().startsWith(value));
      if (!matches.length) return suggestionBox.style.display = "none";

      suggestionBox.style.display = "block";
      matches.forEach(areaName => {
        const div = document.createElement("div");
        div.className = "suggestion-item";
        div.textContent = areaName;
        div.addEventListener("click", () => {
          areaInput.value = areaName;
          suggestionBox.style.display = "none";
        });
        suggestionBox.appendChild(div);
      });
    });

    document.addEventListener("click", (e) => {
      if (!suggestionBox.contains(e.target) && e.target !== areaInput) {
        suggestionBox.style.display = "none";
      }
    });

    // ---------- Load posts ----------
    const q = query(collection(db, "posts"), where("userId", "==", user.uid));
    const postsSnap = await getDocs(q);
    const container = document.getElementById("userPosts");
    container.innerHTML = "";

    let adsCount = 0, totalViews = 0, totalUnlocks = 0;

    if (postsSnap.empty) {
      container.innerHTML = `<p class="empty-msg">You haven’t posted anything yet.</p>`;
    }

    postsSnap.forEach(docSnap => {
      const p = docSnap.data();
      const id = docSnap.id;
      adsCount++;
      if (p.views) totalViews += p.views;
      if (p.unlocks) totalUnlocks += p.unlocks;

      const imgUrl = p.imageUrl || PLACEHOLDER_POST;

      const card = document.createElement("div");
      card.className = "dash-card";

      const img = document.createElement("img");
      img.src = imgUrl;
      img.className = "dash-img";
      img.loading = "lazy";
      img.alt = p.title || "Ad image";
      img.onerror = () => { img.src = PLACEHOLDER_POST; };

      const info = document.createElement("div");
      info.className = "dash-info";
      const h3 = document.createElement("h3");
      h3.textContent = p.title;
      const pDesc = document.createElement("p");
      pDesc.textContent = p.description;
      info.appendChild(h3);
      info.appendChild(pDesc);

      const actions = document.createElement("div");
      actions.className = "dash-actions";

      const editBtn = document.createElement("button");
      editBtn.className = "dash-btn dash-edit";
      editBtn.dataset.id = id;
      editBtn.textContent = "Edit";

      const delBtn = document.createElement("button");
      delBtn.className = "dash-btn dash-delete";
      delBtn.dataset.id = id;
      delBtn.textContent = "Delete";

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      card.appendChild(img);
      card.appendChild(info);
      card.appendChild(actions);

      container.appendChild(card);
    });

    document.getElementById("statAdsCount").textContent = adsCount;
    document.getElementById("statTotalViews").textContent = totalViews;
    document.getElementById("statUnlocks").textContent = totalUnlocks;

    // ---------- Delete buttons ----------
    container.querySelectorAll(".dash-delete").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this ad?")) return;
        const postId = btn.dataset.id;
        const postSnap = await getDoc(doc(db, "posts", postId));
        const post = { id: postId, ...postSnap.data() };
        await deletePostAndImages(post);
        loadView("customer-dashboard");
      });
    });

    // ---------- Edit / New / Logout ----------
    container.querySelectorAll(".dash-edit").forEach(btn => {
      btn.addEventListener("click", () => {
        openScreen("editPost");
        window.editPostId = btn.dataset.id;
      });
    });

    document.getElementById("newPostBtn").addEventListener("click", () => openScreen("post"));

    document.getElementById("logoutBtn").addEventListener("click", () => {
      document.getElementById("logoutOverlay").style.display = "flex";
      signOut(auth).then(() => setTimeout(() => navigateToHome(), 2000));
    });

    // ---------- Auto-delete old posts ----------
    autoDeleteExpiredPosts(user.uid);
  });
});
