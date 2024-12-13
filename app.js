let audioContext;
let analyser;
let dataArray;
let currentDbElement = document.getElementById("currentDb");
let objectionElement = document.getElementById("objection");
let startMessageElement = document.getElementById("startMessage");
let threshold = 70;
let interval = 100;
let isObjectionReady = true;
let cooldown = 1200;
let cachedSounds = null;

const SOUND_FILES = [
  "en_franziskavonkarma.wav",
  "en_godot.wav",
  "en_manfredvonkarma.wav",
  "en_milesedgeworth.wav",
  "en_phoenixwright.wav",
  "en_winstonpayne.wav",
];

const SUPPORTED_LANGUAGES = ["de", "en", "jp", "ko"];
let currentLang = "en";
let objectionImage = document.querySelector("#objection img");

let audioBuffers = {};
let isAudioInitialized = false;

async function initializeAudio() {
  if (isAudioInitialized) return;

  try {
    // Create a single audio context for all sounds
    const context = new (window.AudioContext || window.webkitAudioContext)();

    // Load and decode all sound files
    for (const sound of SOUND_FILES) {
      const response = await fetch(`assets/sfx/${sound}`);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(arrayBuffer);
      audioBuffers[sound] = audioBuffer;
    }

    isAudioInitialized = true;
  } catch (error) {
    console.error("Error initializing audio:", error);
  }
}

async function playSound(buffer) {
  if (!audioContext) return;

  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start(0);

  return new Promise((resolve) => {
    source.onended = resolve;
  });
}

async function playRandomObjection() {
  if (!isAudioInitialized) {
    await initializeAudio();
  }

  if (!cachedSounds || cachedSounds.length === 0) {
    console.error("No sound files available");
    return;
  }

  const randomSound =
    cachedSounds[Math.floor(Math.random() * cachedSounds.length)];
  try {
    const buffer = audioBuffers[randomSound];
    if (buffer) {
      await playSound(buffer);
    }
  } catch (error) {
    console.error("Error playing sound:", error);
  }
}

async function loadSoundFiles() {
  if (cachedSounds) return cachedSounds;
  cachedSounds = SOUND_FILES;
  return cachedSounds;
}

function getMediaDevices() {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    return navigator.mediaDevices.getUserMedia({ audio: true });
  }

  // Legacy support for older browsers
  const getUserMedia =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia;

  if (!getUserMedia) {
    startMessageElement.textContent =
      "Microphone access not supported in this browser";
    return Promise.reject(new Error("getUserMedia not supported"));
  }

  return new Promise((resolve, reject) => {
    getUserMedia.call(navigator, { audio: true }, resolve, reject);
  });
}

function checkSecureContext() {
  if (!window.isSecureContext) {
    startMessageElement.textContent = "Please use HTTPS for microphone access";
    return false;
  }
  return true;
}

function initAudio() {
  if (!checkSecureContext()) return;

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  dataArray = new Uint8Array(analyser.fftSize);

  // Preload sound files
  loadSoundFiles();

  startMessageElement.textContent = "Requesting microphone access...";

  getMediaDevices()
    .then((stream) => {
      let source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      setInterval(updateVolume, interval);
      startMessageElement.style.display = "none";
    })
    .catch((err) => {
      console.error("Error:", err);
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        startMessageElement.textContent =
          "Please allow microphone access in your browser settings";
      } else {
        startMessageElement.textContent = "Error: " + err.message;
      }
    });
}

function setLanguage(lang) {
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    console.error("Unsupported language:", lang);
    return false;
  }
  currentLang = lang;
  objectionImage.src = `assets/img/${lang}_objection.png`;
  return true;
}

// Add language parameter to URL handling
function initApp() {
  const urlParams = new URLSearchParams(window.location.search);
  const lang = urlParams.get("lang") || "en";
  setLanguage(lang);

  // Set initial language selection
  document.getElementById("language").value = currentLang;

  // Add language change listener
  document.getElementById("language").addEventListener("change", (e) => {
    setLanguage(e.target.value);
    // Update URL without reload
    const url = new URL(window.location);
    url.searchParams.set("lang", e.target.value);
    window.history.replaceState({}, "", url);
  });

  // Initialize audio on first interaction
  initializeAudio();
}

// Modify the existing event listener to call initApp
document.addEventListener(
  "click",
  function initOnClick() {
    if (!audioContext) {
      initApp();
      initAudio();
      document.removeEventListener("click", initOnClick);
    }
  },
  { once: true }
);

function getDb(value) {
  return Math.round((value / 255) * 100); // Scale to 0-100dB range
}

function updateVolume() {
  analyser.getByteFrequencyData(dataArray);
  let current = getDb(Math.max(...dataArray));
  currentDbElement.textContent = current;

  if (current > threshold) {
    objection();
  }
}

function objection() {
  if (!isObjectionReady) return;

  isObjectionReady = false;
  objectionElement.style.display = "block";
  playRandomObjection();

  setTimeout(() => {
    objectionElement.style.display = "none";
    setTimeout(() => {
      isObjectionReady = true;
    }, cooldown);
  }, 1000);
}
