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
let volumeControl;
let volumeValue;
let currentVolume = 1;

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
    // Use the existing audioContext instead of creating a new one
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Load and decode all sound files
    for (const sound of SOUND_FILES) {
      const response = await fetch(`assets/sfx/${sound}`);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      audioBuffers[sound] = audioBuffer;
    }

    isAudioInitialized = true;
  } catch (error) {
    console.error("Error initializing audio:", error);
  }
}

async function playSound(buffer) {
  try {
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();

    source.buffer = buffer;
    gainNode.gain.setValueAtTime(currentVolume, audioContext.currentTime);

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start(0);

    return new Promise((resolve) => {
      source.onended = resolve;
    });
  } catch (error) {
    console.error("Error playing sound:", error);
  }
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

  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  analyser = audioContext.createAnalyser();
  dataArray = new Uint8Array(analyser.fftSize);

  // Initialize audio immediately
  initializeAudio();

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

// Add this new function for initial setup
function initializeSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem("slam2object-settings"));
    if (settings) {
      if (settings.language) {
        currentLang = settings.language;
        objectionImage.src = `assets/img/${currentLang}_objection.png`;
      }
      if (settings.volume !== undefined) {
        currentVolume = convertToLogScale(settings.volume);
      }
    }
  } catch (error) {
    console.error("Error loading initial settings:", error);
  }
}

function initApp() {
  // Load initial language from URL or settings
  const urlParams = new URLSearchParams(window.location.search);
  const lang = urlParams.get("lang") || currentLang;
  setLanguage(lang);

  // Initialize controls
  volumeControl = document.getElementById("volume");
  volumeValue = document.getElementById("volumeValue");

  // Load and apply saved settings
  loadSettings();

  // Set up event listeners
  document.getElementById("language").value = currentLang;
  document.getElementById("language").addEventListener("change", (e) => {
    setLanguage(e.target.value);
    const url = new URL(window.location);
    url.searchParams.set("lang", e.target.value);
    window.history.replaceState({}, "", url);
    saveSettings();
  });

  volumeControl.addEventListener("input", (e) => {
    updateVolumeSlider(e.target.value);
  });

  initializeAudio();
}

// Run initial setup before click handler
initializeSettings();

// Update click handler
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

function convertToLogScale(value) {
  // Convert linear slider (0-100) to logarithmic scale with better curve
  const minValue = 0.0001;
  const maxValue = 1;
  const exp = 3; // Curve steepness

  return minValue + (maxValue - minValue) * Math.pow(value / 100, exp);
}

function saveSettings() {
  const settings = {
    volume: volumeControl.value,
    language: currentLang,
  };
  localStorage.setItem("slam2object-settings", JSON.stringify(settings));
}

function loadSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem("slam2object-settings"));
    if (settings) {
      if (settings.volume) {
        volumeControl.value = settings.volume;
        updateVolumeSlider(settings.volume);
      }
      if (settings.language) {
        setLanguage(settings.language);
        document.getElementById("language").value = settings.language;
      }
    }
  } catch (error) {
    console.error("Error loading settings:", error);
  }
}

function updateVolumeSlider(value) {
  volumeControl.style.background = `linear-gradient(to right, var(--accent-color) 0%, var(--accent-color) ${value}%, var(--bg-color) ${value}%)`;
  volumeValue.textContent = `${Math.round(value)}%`;
  currentVolume = convertToLogScale(value);
  saveSettings();
}

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
