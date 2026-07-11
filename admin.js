const PASSWORD = "azothtp123";
const STORAGE_KEY = "techpuleSiteData";
const DB_NAME = "techpuleSiteDB";
const DB_STORE = "files";
const DEFAULT_COVER = "assets/provided/images/instrumental-cover.jpg";

const defaultData = {
  songs: [
    { id: "broken-fairy-tale", title: "Broken Fairy Tale", releaseDate: "", description: "[editable placeholder]", cover: DEFAULT_COVER, audio: "assets/audio/broken-fairy-tale-web.wav", duration: 224.375, isDefault: true },
    { id: "shampoo-maniac", title: "Shampoo Maniac", releaseDate: "", description: "[editable placeholder]", cover: DEFAULT_COVER, audio: "assets/audio/shampoo-maniac-instrumental-web.wav", duration: 249.875, isDefault: true },
    { id: "the-twilight-moon", title: "The Twilight Moon", releaseDate: "", description: "[editable placeholder]", cover: DEFAULT_COVER, audio: "assets/audio/the-twilight-moon-web.wav", duration: 191.221, isDefault: true },
    { id: "till-the-night-fades", title: "Till the Night Fades", releaseDate: "", description: "[editable placeholder]", cover: DEFAULT_COVER, audio: "assets/audio/till-the-night-fades-web.wav", duration: 223.826, isDefault: true },
  ],
  voicebanks: [
    { id: "azoth-cv", title: "AZOTH TP C+V", artwork: "assets/provided/images/azoth-my-boi.png", version: "V1.0", engine: "UTAU / OpenUtau", languages: "English", notes: "[editable placeholder]", download: "assets/voicebanks/AZOTH-TP-CV-1.0.zip", specs: "Type: C+V English, Arpasing-style phonemes\nVoice provider: Techpule\nAuthor: 0neSt4r\nCreated: 04/05/2026\nSize: 22.4 MB" },
    { id: "azoth-cvvc", title: "AZOTH TP CVVC", artwork: "assets/provided/images/azoth-my-boi.png", version: "V1.0", engine: "UTAU / OpenUtau", languages: "English", notes: "[editable placeholder]", download: "assets/voicebanks/AZOTH-TP-CVVC.zip", specs: "Type: CVVC\nVoice provider: Techpule\nAuthor: techpule\nCreated: 20/06/2026\nPitch ranges: F2, C3, C4, F#4, C5\nSize: 56.3 MB" },
    { id: "azoth-rvc2diff", title: "AZOTH TP (RVC2DIFF)", artwork: "assets/provided/images/azoth-my-boi.png", version: "[editable placeholder]", engine: "DiffSinger / RVC2DIFF", languages: "Japanese phonemizer; dictionaries for JA/ZH", notes: "[editable placeholder]", download: "assets/voicebanks/AZOTH-TP-RVC2DIFF.zip", specs: "Author: rubber techpule\nSample rate: 44.1 kHz acoustic, 40 kHz duration model\nModels: acoustic.onnx, dur.onnx, linguistic.onnx, model.onnx vocoder\nPitch / duration prediction: External duration model included\nSize: 392 MB" },
  ],
  announcements: [
    { id: "portfolio-refresh", date: "2026-07-01", status: "Released", title: "Portfolio refresh launched", body: "New design, music player support, updated project sections, and a cleaner release archive." },
    { id: "diffsinger-pass", date: "2026-06-12", status: "In Progress", title: "DiffSinger model tuning pass", body: "Testing consonant timing, phrase stability, and high-register expression for the next beta model." },
    { id: "instrumental-playlist", date: "", status: "Released", title: "Instrumental playlist added", body: "Broken Fairy Tale, Shampoo Maniac, The Twilight Moon, and Till the Night Fades are available in the site player." },
  ],
};

let data = loadData();

const loginPanel = document.querySelector("[data-login-panel]");
const dashboard = document.querySelector("[data-dashboard]");
const passwordInput = document.querySelector("[data-password]");
const loginMessage = document.querySelector("[data-login-message]");
const songList = document.querySelector("[data-song-admin-list]");
const voicebankList = document.querySelector("[data-voicebank-admin-list]");
const announcementList = document.querySelector("[data-announcement-admin-list]");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return clone(defaultData);
  try {
    return { ...clone(defaultData), ...JSON.parse(saved) };
  } catch {
    return clone(defaultData);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveFile(file) {
  if (!file) return "";
  const id = uid("file");
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(file, id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  return `file:${id}`;
}

function estimateDuration(file) {
  return new Promise((resolve) => {
    if (!file) return resolve(0);
    const audio = new Audio(URL.createObjectURL(file));
    audio.onloadedmetadata = () => resolve(audio.duration || 0);
    audio.onerror = () => resolve(0);
  });
}

function field(name, label, value = "", type = "text") {
  return `<label><span>${label}</span><input name="${name}" type="${type}" value="${escapeHtml(value)}" /></label>`;
}

function area(name, label, value = "") {
  return `<label><span>${label}</span><textarea name="${name}">${escapeHtml(value)}</textarea></label>`;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function renderAll() {
  renderSongs();
  renderVoicebanks();
  renderAnnouncements();
}

function renderSongs() {
  songList.innerHTML = data.songs.map((song, index) => `
    <form class="admin-card" data-song-form="${index}">
      <div class="admin-card-head"><h3>${escapeHtml(song.title || "Untitled Song")}</h3><button type="button" data-remove-song="${index}">Remove</button></div>
      <div class="admin-form-grid">
        ${field("title", "Title", song.title)}
        ${field("releaseDate", "Release Date", song.releaseDate, "date")}
        ${field("duration", "Duration in Seconds", song.duration || "", "number")}
        ${field("audio", "Audio Link", song.audio || "")}
        ${field("cover", "Cover Link", song.cover || "")}
        <label><span>Upload Instrumental Audio</span><input name="audioFile" type="file" accept="audio/*" /></label>
        <label><span>Upload Cover Artwork</span><input name="coverFile" type="file" accept="image/*" /></label>
      </div>
      ${area("description", "Description", song.description)}
      <label class="check-row"><input name="isDefault" type="checkbox" ${song.isDefault ? "checked" : ""} /> Default startup queue track</label>
      <button class="glow-button" type="submit">Save Song</button>
    </form>
  `).join("");
}

function renderVoicebanks() {
  voicebankList.innerHTML = data.voicebanks.map((vb, index) => `
    <form class="admin-card" data-voicebank-form="${index}">
      <div class="admin-card-head"><h3>${escapeHtml(vb.title || "Untitled Voicebank")}</h3><button type="button" data-remove-voicebank="${index}">Remove</button></div>
      <div class="admin-form-grid">
        ${field("title", "Title", vb.title)}
        ${field("version", "Version", vb.version)}
        ${field("engine", "Engine", vb.engine)}
        ${field("languages", "Supported Languages", vb.languages)}
        ${field("download", "Download Link", vb.download)}
        ${field("artwork", "Artwork Link", vb.artwork)}
        <label><span>Upload Artwork</span><input name="artworkFile" type="file" accept="image/*" /></label>
        <label><span>Upload Download File</span><input name="downloadFile" type="file" /></label>
      </div>
      ${area("notes", "Release Notes", vb.notes)}
      ${area("specs", "Technical Information", vb.specs)}
      <button class="glow-button" type="submit">Save Voicebank</button>
    </form>
  `).join("");
}

function renderAnnouncements() {
  announcementList.innerHTML = data.announcements.map((item, index) => `
    <form class="admin-card" data-announcement-form="${index}">
      <div class="admin-card-head"><h3>${escapeHtml(item.title || "Untitled Announcement")}</h3><button type="button" data-remove-announcement="${index}">Remove</button></div>
      <div class="admin-form-grid">
        ${field("title", "Title", item.title)}
        ${field("date", "Date", item.date, "date")}
        ${field("status", "Status", item.status)}
      </div>
      ${area("body", "Announcement Text", item.body)}
      <button class="glow-button" type="submit">Save Announcement</button>
    </form>
  `).join("");
}

function showDashboard() {
  loginPanel.hidden = true;
  dashboard.hidden = false;
  renderAll();
}

document.querySelector("[data-login]").addEventListener("click", () => {
  if (passwordInput.value === PASSWORD) {
    sessionStorage.setItem("techpuleAdmin", "true");
    showDashboard();
  } else {
    loginMessage.textContent = "Incorrect password.";
  }
});

if (sessionStorage.getItem("techpuleAdmin") === "true") showDashboard();

document.querySelector("[data-logout]").addEventListener("click", () => {
  sessionStorage.removeItem("techpuleAdmin");
  location.reload();
});

document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-tab]").forEach((item) => item.classList.toggle("is-active", item === button));
    document.querySelectorAll("[data-panel]").forEach((panel) => panel.classList.toggle("is-active", panel.dataset.panel === button.dataset.tab));
  });
});

document.querySelector("[data-add-song]").addEventListener("click", () => {
  data.songs.unshift({ id: uid("song"), title: "New Song", releaseDate: "", description: "", cover: DEFAULT_COVER, audio: "", duration: 0, isDefault: false });
  saveData();
  renderSongs();
});

document.querySelector("[data-add-voicebank]").addEventListener("click", () => {
  data.voicebanks.unshift({ id: uid("voicebank"), title: "New Voicebank", artwork: "assets/provided/images/azoth-my-boi.png", version: "", engine: "", languages: "", notes: "", download: "", specs: "" });
  saveData();
  renderVoicebanks();
});

document.querySelector("[data-add-announcement]").addEventListener("click", () => {
  data.announcements.unshift({ id: uid("announcement"), date: "", status: "Update", title: "New Announcement", body: "" });
  saveData();
  renderAnnouncements();
});

document.addEventListener("click", (event) => {
  const song = event.target.closest("[data-remove-song]");
  const vb = event.target.closest("[data-remove-voicebank]");
  const ann = event.target.closest("[data-remove-announcement]");
  if (song) { data.songs.splice(Number(song.dataset.removeSong), 1); saveData(); renderSongs(); }
  if (vb) { data.voicebanks.splice(Number(vb.dataset.removeVoicebank), 1); saveData(); renderVoicebanks(); }
  if (ann) { data.announcements.splice(Number(ann.dataset.removeAnnouncement), 1); saveData(); renderAnnouncements(); }
});

document.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const values = Object.fromEntries(new FormData(form).entries());
  const songIndex = form.dataset.songForm;
  const vbIndex = form.dataset.voicebankForm;
  const annIndex = form.dataset.announcementForm;

  if (songIndex !== undefined) {
    const audioFile = form.elements.audioFile.files[0];
    const coverFile = form.elements.coverFile.files[0];
    data.songs[songIndex] = {
      ...data.songs[songIndex],
      title: values.title,
      releaseDate: values.releaseDate,
      description: values.description,
      duration: Number(values.duration) || (await estimateDuration(audioFile)) || data.songs[songIndex].duration || 0,
      audio: audioFile ? await saveFile(audioFile) : values.audio,
      cover: coverFile ? await saveFile(coverFile) : values.cover,
      isDefault: form.elements.isDefault.checked,
    };
  }

  if (vbIndex !== undefined) {
    const artworkFile = form.elements.artworkFile.files[0];
    const downloadFile = form.elements.downloadFile.files[0];
    data.voicebanks[vbIndex] = {
      ...data.voicebanks[vbIndex],
      title: values.title,
      version: values.version,
      engine: values.engine,
      languages: values.languages,
      notes: values.notes,
      specs: values.specs,
      artwork: artworkFile ? await saveFile(artworkFile) : values.artwork,
      download: downloadFile ? await saveFile(downloadFile) : values.download,
    };
  }

  if (annIndex !== undefined) {
    data.announcements[annIndex] = { ...data.announcements[annIndex], title: values.title, date: values.date, status: values.status, body: values.body };
  }

  saveData();
  renderAll();
});

document.querySelector("[data-export]").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "techpule-site-data.json";
  link.click();
});
