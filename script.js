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

let siteData = loadSiteData();
let resolvedSongs = [];
let queue = [];
let queueIndex = 0;
let showAllSongs = false;

const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector("[data-nav-links]");
const legacyAudio = document.querySelector("[data-audio]");
const player = document.querySelector("[data-player]");
const cover = document.querySelector("[data-cover]");
const title = document.querySelector("[data-title]");
const playButton = document.querySelector("[data-play]");
const prevButton = document.querySelector("[data-prev]");
const nextButton = document.querySelector("[data-next]");
const shuffleButton = document.querySelector("[data-shuffle]");
const repeatButton = document.querySelector("[data-repeat]");
const minimizeButton = document.querySelector("[data-minimize]");
const progress = document.querySelector("[data-progress]");
const volume = document.querySelector("[data-volume]");
const currentTimeLabel = document.querySelector("[data-current]");
const durationLabel = document.querySelector("[data-duration]");
const playlist = document.querySelector("[data-playlist]");
const resetQueueButton = document.querySelector("[data-reset-queue]");
const musicList = document.querySelector("[data-music-list]");
const voicebankList = document.querySelector("[data-voicebank-list]");
const announcementList = document.querySelector("[data-announcement-list]");
const showAllButton = document.querySelector("[data-show-all-songs]");

navToggle?.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

navLinks?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    navLinks.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
  }
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 },
);

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));
window.setTimeout(() => {
  document.querySelectorAll(".reveal:not(.is-visible)").forEach((element) => element.classList.add("is-visible"));
}, 1200);

let audioContext = null;
let gainNode = null;
let sourceNode = null;
let startedAt = 0;
let pausedAt = 0;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
let isSeeking = false;
let wantsPlayback = true;
let loadToken = 0;
const bufferCache = new Map();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadSiteData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return clone(defaultData);
  try {
    return { ...clone(defaultData), ...JSON.parse(saved) };
  } catch {
    return clone(defaultData);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getStoredFileUrl(id) {
  if (!id) return "";
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const request = tx.objectStore(DB_STORE).get(id);
    request.onsuccess = () => resolve(request.result ? URL.createObjectURL(request.result) : "");
    request.onerror = () => resolve("");
  });
}

async function resolveAsset(value) {
  if (!value) return "";
  if (value.startsWith("file:")) return getStoredFileUrl(value.slice(5));
  return value;
}

async function resolveSong(song) {
  return {
    ...song,
    coverUrl: (await resolveAsset(song.cover)) || DEFAULT_COVER,
    audioUrl: await resolveAsset(song.audio),
  };
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

function parseSpecs(item) {
  const rows = [
    ["Engine", item.engine],
    ["Language", item.languages],
    ["Version", item.version],
    ["Release notes", item.notes],
  ];
  String(item.specs || "").split("\n").forEach((line) => {
    const [key, ...rest] = line.split(":");
    if (key && rest.length) rows.push([key.trim(), rest.join(":").trim()]);
  });
  return rows.filter(([, value]) => value);
}

function sortByRelease(items) {
  return [...items].sort((a, b) => String(b.releaseDate || "").localeCompare(String(a.releaseDate || "")));
}

async function renderPublicContent() {
  resolvedSongs = await Promise.all(siteData.songs.map(resolveSong));
  resetDefaultQueue(false);
  renderMusic();
  renderVoicebanks();
  renderAnnouncements();
  renderQueue();
  updateTrack(0, false);
}

function renderMusic() {
  const songs = sortByRelease(resolvedSongs);
  const visible = showAllSongs ? songs : songs.slice(0, 4);
  musicList.innerHTML = visible.map((song) => `
    <article class="project-card reveal is-visible">
      <img src="${escapeHtml(song.coverUrl)}" alt="${escapeHtml(song.title)} cover artwork" />
      <div class="card-body">
        <span class="date">${song.releaseDate ? escapeHtml(song.releaseDate) : "Release date: [editable placeholder]"}</span>
        <h3>${escapeHtml(song.title)} <span class="title-tag">Instrumental</span></h3>
        <p>${escapeHtml(song.description || "[editable placeholder]")}</p>
        <div class="song-actions">
          <button class="outline-button" type="button" data-play-song="${escapeHtml(song.id)}">Play Now</button>
          <button class="outline-button" type="button" data-queue-song="${escapeHtml(song.id)}">Add to Queue</button>
        </div>
      </div>
    </article>
  `).join("");
  showAllButton.hidden = songs.length <= 4;
  showAllButton.textContent = showAllSongs ? "Show Recent Songs" : "Show All Songs";
}

async function renderVoicebanks() {
  const cards = await Promise.all(siteData.voicebanks.map(async (vb) => {
    const artwork = (await resolveAsset(vb.artwork)) || "assets/provided/images/azoth-my-boi.png";
    const specs = parseSpecs(vb).map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
    const href = vb.download?.startsWith("file:") ? await resolveAsset(vb.download) : vb.download;
    return `
      <article class="voice-card reveal is-visible">
        <img src="${escapeHtml(artwork)}" alt="${escapeHtml(vb.title)} artwork" />
        <div class="card-body">
          <div class="card-topline"><span class="badge">${escapeHtml(vb.engine || "Engine")}</span><span>${escapeHtml(vb.version || "Version")}</span></div>
          <h3>${escapeHtml(vb.title)}</h3>
          <dl class="spec-list">${specs}</dl>
          <a class="outline-button download-button" href="${escapeHtml(href || "#")}" download>Download</a>
        </div>
      </article>
    `;
  }));
  voicebankList.innerHTML = cards.join("");
}

function renderAnnouncements() {
  const items = [...siteData.announcements].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  announcementList.innerHTML = items.map((item) => `
    <article class="timeline-item reveal is-visible">
      <time datetime="${escapeHtml(item.date || "")}">${item.date ? escapeHtml(item.date) : "Date: [editable placeholder]"}</time>
      <span class="status ${escapeHtml((item.status || "").toLowerCase().replace(/\s+/g, "-"))}">${escapeHtml(item.status || "Update")}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.body)}</p>
    </article>
  `).join("");
}

function resetDefaultQueue(keepCurrent = true) {
  const defaults = resolvedSongs.filter((song) => song.isDefault);
  queue = defaults.length ? [...defaults] : [...resolvedSongs];
  if (!keepCurrent) queueIndex = 0;
}

function renderQueue() {
  playlist.innerHTML = queue.map((track, index) => `
    <li>
      <button type="button" data-queue-index="${index}" class="${index === queueIndex ? "is-current" : ""}">
        <img src="${escapeHtml(track.coverUrl || track.cover || DEFAULT_COVER)}" alt="" />
        <span>${escapeHtml(track.title)}</span>
      </button>
      <button type="button" class="queue-remove" data-remove-queue="${index}" aria-label="Remove ${escapeHtml(track.title)} from queue">Remove</button>
    </li>
  `).join("");
}

function getCurrentTrack() {
  return queue[queueIndex] || queue[0];
}

function getTrackDuration() {
  return bufferCache.get(getCurrentTrack()?.id)?.duration || getCurrentTrack()?.duration || 0;
}

function clampTime(seconds) {
  const duration = getTrackDuration();
  if (!Number.isFinite(seconds)) return 0;
  return Math.min(Math.max(0, seconds), Math.max(0, duration - 0.05));
}

function getPlaybackTime() {
  if (!isPlaying || !audioContext) return pausedAt;
  return clampTime(audioContext.currentTime - startedAt);
}

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
    gainNode = audioContext.createGain();
    gainNode.gain.value = Number(volume.value);
    gainNode.connect(audioContext.destination);
  }
  return audioContext.resume();
}

async function loadTrackBuffer(track) {
  if (bufferCache.has(track.id)) return bufferCache.get(track.id);
  await ensureAudioContext();
  const response = await fetch(track.audioUrl || track.audio);
  const arrayBuffer = await response.arrayBuffer();
  const decoded = await audioContext.decodeAudioData(arrayBuffer);
  bufferCache.set(track.id, decoded);
  return decoded;
}

function stopSource() {
  if (!sourceNode) return;
  sourceNode.onended = null;
  try { sourceNode.stop(); } catch {}
  sourceNode.disconnect();
  sourceNode = null;
}

function syncProgress() {
  const track = getCurrentTrack();
  if (!track) return;
  const duration = getTrackDuration();
  const current = isSeeking ? Number(progress.value) : getPlaybackTime();
  progress.max = String(duration);
  progress.value = String(clampTime(current));
  currentTimeLabel.textContent = formatTime(current);
  durationLabel.textContent = formatTime(duration);
  window.techpulePlayerState = { title: track.title, currentTime: current, duration, isPlaying, queueIndex, queueLength: queue.length };
}

function updatePlayButton() {
  playButton.textContent = isPlaying ? "Pause" : "Play";
  playButton.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
}

async function startSource(offset = null) {
  const track = getCurrentTrack();
  if (!track?.audioUrl && !track?.audio) return;
  const token = ++loadToken;
  const buffer = await loadTrackBuffer(track);
  if (token !== loadToken) return;
  stopSource();
  const safeOffset = clampTime(offset ?? pausedAt);
  sourceNode = audioContext.createBufferSource();
  sourceNode.buffer = buffer;
  sourceNode.connect(gainNode);
  sourceNode.onended = () => {
    const finished = getPlaybackTime() >= getTrackDuration() - 0.35;
    if (!isPlaying || !finished) return;
    if (isRepeat) {
      pausedAt = 0;
      startSource(0);
      return;
    }
    nextTrack(true);
  };
  startedAt = audioContext.currentTime - safeOffset;
  pausedAt = safeOffset;
  sourceNode.start(0, safeOffset);
  isPlaying = true;
  updatePlayButton();
  syncProgress();
}

async function playCurrentTrack() {
  wantsPlayback = true;
  await ensureAudioContext();
  await startSource();
}

function pauseCurrentTrack() {
  pausedAt = getPlaybackTime();
  isPlaying = false;
  wantsPlayback = false;
  stopSource();
  updatePlayButton();
  syncProgress();
}

function updateTrack(index, autoplay = false) {
  queueIndex = (index + queue.length) % queue.length;
  const track = getCurrentTrack();
  ++loadToken;
  stopSource();
  isPlaying = false;
  pausedAt = 0;
  cover.src = track?.coverUrl || DEFAULT_COVER;
  title.textContent = track?.title || "Queue empty";
  if (legacyAudio) legacyAudio.src = track?.audioUrl || track?.audio || "";
  progress.max = String(track?.duration || 0);
  progress.value = "0";
  currentTimeLabel.textContent = "0:00";
  durationLabel.textContent = formatTime(track?.duration || 0);
  renderQueue();
  updatePlayButton();
  if (autoplay) playCurrentTrack().catch(() => armFirstInteractionPlayback());
}

function nextTrack(autoplay = isPlaying || wantsPlayback) {
  if (!queue.length) return;
  if (isShuffle) {
    const next = Math.floor(Math.random() * queue.length);
    updateTrack(next === queueIndex ? next + 1 : next, autoplay);
    return;
  }
  updateTrack(queueIndex + 1, autoplay);
}

function addToQueue(song, playNow = false) {
  const prepared = resolvedSongs.find((item) => item.id === song.id) || song;
  if (playNow) {
    queue.splice(queueIndex + 1, 0, prepared);
    updateTrack(queueIndex + 1, true);
    return;
  }
  queue.push(prepared);
  renderQueue();
}

function armFirstInteractionPlayback() {
  const startAfterInteraction = () => {
    if (!isPlaying) playCurrentTrack().catch(() => {});
    removeInteractionListeners();
  };
  const removeInteractionListeners = () => {
    ["click", "pointerdown", "keydown", "touchstart", "scroll"].forEach((eventName) => window.removeEventListener(eventName, startAfterInteraction));
  };
  ["click", "pointerdown", "keydown", "touchstart", "scroll"].forEach((eventName) => window.addEventListener(eventName, startAfterInteraction, { once: true, passive: true }));
}

musicList.addEventListener("click", (event) => {
  const playId = event.target.closest("[data-play-song]")?.dataset.playSong;
  const queueId = event.target.closest("[data-queue-song]")?.dataset.queueSong;
  const song = resolvedSongs.find((item) => item.id === (playId || queueId));
  if (!song) return;
  addToQueue(song, Boolean(playId));
});

showAllButton.addEventListener("click", () => {
  showAllSongs = !showAllSongs;
  renderMusic();
});

playlist.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-queue]");
  if (removeButton) {
    const removeIndex = Number(removeButton.dataset.removeQueue);
    if (queue.length <= 1) return;
    queue.splice(removeIndex, 1);
    if (removeIndex < queueIndex) queueIndex -= 1;
    if (removeIndex === queueIndex) updateTrack(Math.min(queueIndex, queue.length - 1), isPlaying || wantsPlayback);
    else renderQueue();
    return;
  }
  const button = event.target.closest("[data-queue-index]");
  if (!button) return;
  updateTrack(Number(button.dataset.queueIndex), true);
});

resetQueueButton.addEventListener("click", () => {
  resetDefaultQueue(false);
  updateTrack(0, isPlaying || wantsPlayback);
});

playButton.addEventListener("click", () => isPlaying ? pauseCurrentTrack() : playCurrentTrack().catch(() => {}));
progress.addEventListener("input", () => {
  isSeeking = true;
  const seekTo = clampTime(Number(progress.value));
  pausedAt = seekTo;
  progress.value = String(seekTo);
  currentTimeLabel.textContent = formatTime(seekTo);
  window.techpulePlayerState = { ...window.techpulePlayerState, currentTime: seekTo };
  if (isPlaying) startSource(seekTo).catch(() => {});
});
function commitProgressSeek() {
  const seekTo = clampTime(Number(progress.value));
  pausedAt = seekTo;
  isSeeking = false;
  if (isPlaying) startSource(seekTo).catch(() => {});
  else syncProgress();
}
progress.addEventListener("change", commitProgressSeek);
progress.addEventListener("pointerup", commitProgressSeek);
progress.addEventListener("keyup", (event) => {
  if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) commitProgressSeek();
});
volume.addEventListener("input", () => {
  if (gainNode) gainNode.gain.value = Number(volume.value);
});
prevButton.addEventListener("click", () => updateTrack(queueIndex - 1, isPlaying || wantsPlayback));
nextButton.addEventListener("click", () => nextTrack(isPlaying || wantsPlayback));
shuffleButton.addEventListener("click", () => {
  isShuffle = !isShuffle;
  shuffleButton.classList.toggle("is-active", isShuffle);
});
repeatButton.addEventListener("click", () => {
  isRepeat = !isRepeat;
  repeatButton.classList.toggle("is-active", isRepeat);
});
minimizeButton.addEventListener("click", () => {
  const isMinimized = player.classList.toggle("is-minimized");
  minimizeButton.textContent = isMinimized ? "+" : "_";
  minimizeButton.setAttribute("aria-label", isMinimized ? "Expand player" : "Minimize player");
});

function tick() {
  if (!isSeeking) syncProgress();
  requestAnimationFrame(tick);
}

renderPublicContent().then(() => {
  armFirstInteractionPlayback();
  playCurrentTrack().catch(() => armFirstInteractionPlayback());
  tick();
});
