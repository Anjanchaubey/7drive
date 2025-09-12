// Firebase Init
const firebaseConfig = {
  apiKey: "AIzaSyCYY2GQqS0tCXb7Oxw8AWXhpexq9e8VRUs",
  authDomain: "aspirehub-32863.firebaseapp.com",
  projectId: "aspirehub-32863",
  storageBucket: "aspirehub-32863.appspot.com",
  messagingSenderId: "686810111182",
  appId: "1:686810111182:web:4290b4b1b6e64934ec449f",
  measurementId: "G-KX41R0SSMY"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const storage = firebase.storage();

// Theme persistence
const savedTheme = localStorage.getItem("theme");
document.body.dataset.theme = savedTheme || "light";
window.toggleTheme = () => {
  const next = document.body.dataset.theme === "dark" ? "light" : "dark";
  document.body.dataset.theme = next;
  localStorage.setItem("theme", next);
};

const folderSelect = document.getElementById("folderSelect");
const uploadArea = document.getElementById("uploadArea");
const fileInput   = document.getElementById("fileInput");
const fileList    = document.getElementById("fileList");
const folderModal = document.getElementById("folderModal");
const folderNameInput = document.getElementById("folderNameInput");
const folderCreateBtn = document.getElementById("folderCreateBtn");
const folderCancelBtn = document.getElementById("folderCancelBtn");

const uploadProfilePic = document.getElementById("uploadProfilePic");
const cropModal     = document.getElementById("cropModal");
const cropImage     = document.getElementById("cropImage");
const uploadCropBtn = document.getElementById("uploadCropBtn");
const cancelCropBtn = document.getElementById("cancelCropBtn");
let cropper;

let filesMeta = [], folders = [];
const DEFAULT_FOLDER = "home";

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
auth.onAuthStateChanged(async user => {
  if (!user) return location.href = "index.html";
  const rootRef = storage.ref(user.email + "/");
  const rootList = await rootRef.listAll();
  if (!rootList.prefixes.some(p => p.name.replace(/\/$/, "") === DEFAULT_FOLDER)) {
    await storage.ref(`${user.email}/${DEFAULT_FOLDER}/.placeholder`).put(new Blob([]));
  }
  initDashboard();
});

function initDashboard() {
  loadFolders().then(() => {
    folderSelect.value = DEFAULT_FOLDER;
    renderForFolder();
  });
  setupFolderModal();
  setupAccountSection();
  folderSelect.onchange = () => renderForFolder();

}

function setupAccountSection() {
  const acc = document.getElementById("accountSection");
  const modal = document.getElementById("accountModal");
  const closeBtn = document.getElementById("closeAccBtn");
  const resetBtn = document.getElementById("resetPasswordBtn");
  const user = auth.currentUser;

  const profRef = storage.ref(`${user.email}/profile-pic.jpg`);
  profRef.getDownloadURL()
    .then(url => {
      document.getElementById("profilePic").src = url;
      document.getElementById("accPic").src = url;
    })
    .catch(() => {});

  document.getElementById("usernameDisplay").textContent = user.email.split("@")[0];
  document.getElementById("accUsername").textContent        = user.email.split("@")[0];
  document.getElementById("accEmail").textContent           = user.email;
  document.getElementById("accCreated").textContent         = new Date(user.metadata.creationTime).toLocaleDateString();

  storage.ref(`${user.email}/${folderSelect.value}/`).listAll()
    .then(res => document.getElementById("accFilesCount").textContent = res.items.length);

  acc.onclick     = () => modal.classList.remove("hidden");
  closeBtn.onclick = () => modal.classList.add("hidden");
  resetBtn.onclick = () => auth.sendPasswordResetEmail(user.email).then(() => alert("Reset link sent"));

  uploadProfilePic.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      cropImage.src = reader.result;
      cropModal.classList.remove("hidden");
      if (cropper) cropper.destroy();
      cropper = new Cropper(cropImage, { aspectRatio: 1, viewMode: 1 });
    };
    reader.readAsDataURL(file);
  };
}

uploadCropBtn.onclick = () => {
  cropper.getCroppedCanvas({ width: 256, height: 256 }).toBlob(blob => {
    const profRef = storage.ref(`${auth.currentUser.email}/profile-pic.jpg`);
    profRef.put(blob).then(() => {
      cropper.destroy();
      cropModal.classList.add("hidden");
      setupAccountSection();
    });
  });
};

cancelCropBtn.onclick = () => {
  cropper.destroy();
  cropModal.classList.add("hidden");
};

async function loadFolders() {
  const listResult = await storage.ref(auth.currentUser.email + "/").listAll();
  folders = listResult.prefixes.map(pref => pref.name.replace(/\/$/, ""));
  folderSelect.innerHTML = folders.map(f => `<option value="${f}">${f}</option>`).join("");
}

function renderForFolder() {
  loadFiles(folderSelect.value);
}

async function loadFiles(folder = "") {
  fileList.innerHTML = "";
  const prefix = auth.currentUser.email + "/" + (folder ? folder + "/" : "");
  const list = await storage.ref(prefix).listAll();
filesMeta = await Promise.all(
  list.items.filter(i => i.name !== ".placeholder").map(async item => {
    const meta = await item.getMetadata();
    return {
      ref: item,
      name: item.name,
      size: meta.size,
      type: meta.contentType,
      updated: meta.updated
    };
  })
);



  renderFileList();
}

function renderFileList(filter = "") {
  fileList.innerHTML = "";
  const sortBy = document.getElementById("sortSelect").value;
const arr = filesMeta
  .filter(f => f.name.toLowerCase().includes(filter.toLowerCase()))
  .sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "size") return b.size - a.size;
    if (sortBy === "updated") return b.updated - a.updated;
  });

  arr.forEach(m => fileList.appendChild(createFileItem(m)));
}

function createFileItem({ name, size, type, updated, ref }) {
  const el = document.createElement("li");
  el.className = "file-item";

  el.onclick = (e) => {
    if (e.target.closest("button")) return; // Skip if clicking on preview/share buttons
    el.classList.toggle("selected");
    el.querySelector(".checkbox").checked = el.classList.contains("selected");
  };

  const formattedDate = updated
    ? new Date(updated).toLocaleString()
    : "Unknown date";

  const ext = name.split(".").pop().toLowerCase();
  const previewId = `preview-${Math.random().toString(36).substring(2)}`;

  el.innerHTML = `
    <header>
      <input type="checkbox" class="checkbox" data-name="${name}" />
      <button class="btn icon" onclick="previewFile('${name}')">👁️</button>
      <button class="btn icon" onclick="shareLink('${name}')">🔗</button>
    </header>
    <div class="thumbnail" id="${previewId}">Loading...</div>
    <div class="filename">${name}</div>
    <div class="file-meta">${type || "Unknown"} • ${formatBytes(size)} • ${formattedDate}</div>
    <div class="progress-bar"><div class="progress"></div></div>
  `;

  // Thumbnail/image/video preview logic
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
    const thumbRef = storage.ref(`${auth.currentUser.email}/${folderSelect.value}/thumbnails/${name}.jpg`);
    thumbRef.getDownloadURL()
      .then(thumbUrl => {
        el.querySelector(`#${previewId}`).innerHTML = `
          <img src="${thumbUrl}" class="preview-img" alt="${name}" />`;
      })
      .catch(() => {
        // Fallback to full image if no thumbnail found
        ref.getDownloadURL().then(url => {
          el.querySelector(`#${previewId}`).innerHTML = `
            <img src="${url}" class="preview-img" alt="${name}" />`;
        });
      });
  } else if (["mp4", "webm"].includes(ext)) {
    ref.getDownloadURL().then(url => {
      el.querySelector(`#${previewId}`).innerHTML = `
        <video src="${url}" muted preload="metadata" class="preview-video"></video>`;
    });
  } else {
    el.querySelector(`#${previewId}`).innerHTML = `
      <div class="file-icon">${ext.toUpperCase()}</div>`;
  }

  return el;
}






function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}


["dragover","dragleave","drop"].forEach(evt =>
  uploadArea.addEventListener(evt, e => {
    e.preventDefault();
    uploadArea.classList.toggle("dragover", evt === "dragover");
    if (evt === "drop") handleFiles(e.dataTransfer.files);
  })
);

fileInput.addEventListener("change", () => handleFiles(fileInput.files));

function handleFiles(list) {
  Array.from(list).forEach(f => uploadFile(f, folderSelect.value || DEFAULT_FOLDER));
}

function uploadFile(file, folder) {
  const userPath = `${auth.currentUser.email}/${folder}/`;
  const fullPath = `${userPath}${file.name}`;
  const task = storage.ref(fullPath).put(file);

  const li = createFileItem({ name: file.name, size: file.size, type: file.type, ref: storage.ref(fullPath) });
  fileList.appendChild(li);
  const prog = li.querySelector(".progress-bar");

  task.on("state_changed", s => {
    const pct = (s.bytesTransferred / s.totalBytes) * 100;
    prog.querySelector(".progress").style.width = pct + "%";
  }, alert, async () => {
    setTimeout(() => prog.style.display = "none", 800);
    await uploadThumbnail(file, userPath); // 👈 New step: upload thumbnail
    renderForFolder();
  });
}

async function uploadThumbnail(file, basePath) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (!["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return;

  const img = new Image();
  const reader = new FileReader();

  reader.onload = () => {
    img.onload = () => {
      const canvas = document.createElement("canvas");

      // ULTRA LOW RES: 50px width max
      const maxWidth = 50;
      const scale = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(blob => {
        const thumbPath = `${basePath}thumbnails/${file.name}.jpg`;
        storage.ref(thumbPath).put(blob);
      }, "image/jpeg", 0.3); // Low quality JPEG (30%)
    };
    img.src = reader.result;
  };

  reader.readAsDataURL(file);
}



window.filterFiles = () => renderFileList(document.getElementById("search").value);

window.downloadSelected = async () => {
  const ch = [...document.querySelectorAll(".checkbox:checked")];
  if (!ch.length) return alert("No files");
  for (let cb of ch) {
    const path = `${auth.currentUser.email}/${folderSelect.value}/${cb.dataset.name}`;
    const url = await storage.ref(path).getDownloadURL();
    const a = document.createElement("a");
    a.href = url;
    a.download = cb.dataset.name;
    a.click();
  }
};

window.deleteSelected = async () => {
  const ch = [...document.querySelectorAll(".checkbox:checked")];
  if (!ch.length) return alert("No files");
  if (!confirm("Delete these files?")) return;
  for (let cb of ch) {
    const path = `${auth.currentUser.email}/${folderSelect.value}/${cb.dataset.name}`;
    await storage.ref(path).delete();
  }
  renderForFolder();
};

function setupFolderModal() {
  folderCancelBtn.onclick = () => folderModal.classList.add("hidden");
  folderCreateBtn.onclick = () => {
    const name = folderNameInput.value.trim();
    if (!name) return folderNameInput.focus();
    storage.ref(`${auth.currentUser.email}/${name}/.placeholder`).put(new Blob([]))
      .then(() => {
        folderModal.classList.add("hidden");
        loadFolders();
      });
  };
}

window.createFolder = () => {
  folderNameInput.value="";
  folderModal.classList.remove("hidden");
};

window.shareLink = async nm => {
  const path = `${auth.currentUser.email}/${folderSelect.value}/${nm}`;
  const url = await storage.ref(path).getDownloadURL();
  await navigator.clipboard.writeText(url);
  alert("Link copied");
};

window.previewFile = async nm => {
  const ext = nm.split(".").pop().toLowerCase();
  const url = await storage.ref(`${auth.currentUser.email}/${folderSelect.value}/${nm}`).getDownloadURL();
  if (["png","jpg","jpeg","gif","pdf","mp4","webm","mkv"].includes(ext)) {
    window.open(url, "_blank");
  } else alert("Preview unavailable");
};

window.logout = () => auth.signOut().then(() => location.href="index.html");

// Drag-select logic
let dragging = false;
fileList.addEventListener("mousedown", e => {
  const item = e.target.closest(".file-item");
  if (!item) return;
  dragging = true;
  document.addEventListener("mousemove", dragSelect);
  document.addEventListener("mouseup", () => {
    dragging=false;
    document.removeEventListener("mousemove", dragSelect);
  }, { once: true });
});

function dragSelect(e) {
  if (!dragging) return;
  document.querySelectorAll(".file-item").forEach(item => {
    const r = item.getBoundingClientRect();
    const over = e.pageX >= r.left && e.pageX <= r.right &&
                 e.pageY >= r.top  && e.pageY <= r.bottom;
    item.classList.toggle("selected", over);
    item.querySelector(".checkbox").checked = over;
  });
}


let isSelecting = false;
let selectionBox;
let startX, startY;

fileList.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return; // Only left click
  isSelecting = true;

  startX = e.pageX;
  startY = e.pageY;

  selectionBox = document.createElement("div");
  selectionBox.className = "selection-box";
  document.body.appendChild(selectionBox);

  document.addEventListener("mousemove", updateSelectionBox);
  document.addEventListener("mouseup", finishSelectionBox);
});

function updateSelectionBox(e) {
  if (!isSelecting) return;

  const x1 = Math.min(e.pageX, startX);
  const y1 = Math.min(e.pageY, startY);
  const x2 = Math.max(e.pageX, startX);
  const y2 = Math.max(e.pageY, startY);

  Object.assign(selectionBox.style, {
    left: x1 + "px",
    top: y1 + "px",
    width: (x2 - x1) + "px",
    height: (y2 - y1) + "px"
  });

  document.querySelectorAll(".file-item").forEach(item => {
    const rect = item.getBoundingClientRect();
    const itemX1 = rect.left + window.scrollX;
    const itemY1 = rect.top + window.scrollY;
    const itemX2 = rect.right + window.scrollX;
    const itemY2 = rect.bottom + window.scrollY;

    const intersect = !(itemX1 > x2 || itemX2 < x1 || itemY1 > y2 || itemY2 < y1);

    item.classList.toggle("selected", intersect);
    item.querySelector(".checkbox").checked = intersect;
  });
}


function finishSelectionBox() {
  isSelecting = false;
  if (selectionBox) {
    selectionBox.remove();
    selectionBox = null;
  }
  document.removeEventListener("mousemove", updateSelectionBox);
  document.removeEventListener("mouseup", finishSelectionBox);
}

document.addEventListener("keydown", async e => {
  if (e.code === "Space") {
    e.preventDefault(); // Stop page from scrolling
    const selected = document.querySelector(".file-item.selected");
    if (!selected) return;
    const fileName = selected.querySelector(".checkbox").dataset.name;
    previewFile(fileName);
  }
});

document.addEventListener("keydown", e => {
  const selected = document.querySelectorAll(".file-item.selected");
  const isInputActive = document.activeElement.tagName === "INPUT";

  // Ctrl+A — Select all files
  if (e.ctrlKey && e.key.toLowerCase() === "a") {
    e.preventDefault();
    document.querySelectorAll(".file-item").forEach(item => {
      item.classList.add("selected");
      item.querySelector(".checkbox").checked = true;
    });
  }

  // Delete — Delete selected files
  if (e.key === "Delete" && selected.length) {
    deleteSelected();
  }

  // U — Upload file
  if (e.key.toLowerCase() === "u") {
    fileInput.click();
  }

  // Escape — Deselect all
  if (e.key === "Escape") {
    selected.forEach(item => {
      item.classList.remove("selected");
      item.querySelector(".checkbox").checked = false;
    });
  }

  // R — Refresh folder
  if (e.key.toLowerCase() === "r") {
    renderForFolder();
  }

  // N — New folder
  if (e.key.toLowerCase() === "n") {
    createFolder();
  }

  // S — Focus search
  if (e.key.toLowerCase() === "s" && !isInputActive) {
    e.preventDefault();
    document.getElementById("search").focus();
  }

  // P — Open Profile
  if (e.key.toLowerCase() === "p") {
    document.getElementById("accountModal").classList.remove("hidden");
  }

  // T — Toggle Theme
  if (e.key.toLowerCase() === "t") {
    toggleTheme();
  }

  // Enter or Space — Preview first selected
  if ((e.key === "Enter" || e.key === " ") && selected.length && !isInputActive) {
    e.preventDefault();
    const fileName = selected[0].querySelector(".checkbox").dataset.name;
    previewFile(fileName);
  }
});

window.showShortcuts = () => {
  document.getElementById("shortcutsModal").classList.remove("hidden");
};

window.hideShortcuts = () => {
  document.getElementById("shortcutsModal").classList.add("hidden");
};
window.setDisplayMode = mode => {
  const list = document.getElementById("fileList");
  if (mode === "grid") {
    list.classList.remove("inline-view");
  } else {
    list.classList.add("inline-view");
  }
  localStorage.setItem("displayMode", mode);
};

// Restore previous view on load
window.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("displayMode");
  if (saved) setDisplayMode(saved);
});
