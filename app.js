// App Configuration
const CONFIG = {
  SOUNDS: [
    "en_franziskavonkarma.wav",
    "en_godot.wav",
    "en_manfredvonkarma.wav",
    "en_milesedgeworth.wav",
    "en_phoenixwright.wav",
    "en_winstonpayne.wav",
  ],
  LANGUAGES: ["de", "en", "jp", "ko"],
  SETTINGS_KEY: "slam2object-settings",
  THRESHOLD_RANGE: { MIN: 40, MAX: 100, DEFAULT: 75 },
  COOLDOWN: 1200,
  CHARACTERS: {
    random: "Random",
    franziskavonkarma: "Franziska von Karma",
    godot: "Godot",
    manfredvonkarma: "Manfred von Karma",
    milesedgeworth: "Miles Edgeworth",
    phoenixwright: "Phoenix Wright",
    winstonpayne: "Winston Payne",
  },
  THEMES: ["simple-dark", "simple-light", "court"],
};

// App State
const state = {
  audio: {
    context: null,
    analyser: null,
    dataArray: null,
    buffers: {},
    initialized: false,
  },
  settings: {
    language: "en",
    volume: 1,
    threshold: CONFIG.THRESHOLD_RANGE.DEFAULT,
    character: "random",
    theme: "simple-dark",
  },
  ready: true,
};

// DOM Elements
const dom = {
  currentDb: document.getElementById("currentDb"),
  objection: document.getElementById("objection"),
  message: document.getElementById("startMessage"),
  controls: {
    language: document.getElementById("language"),
    volume: document.getElementById("volume"),
    volumeValue: document.getElementById("volumeValue"),
    threshold: document.getElementById("threshold"),
    thresholdValue: document.getElementById("thresholdValue"),
    character: document.getElementById("character"),
    theme: document.getElementById("theme"),
  },
  objectionImage: document.querySelector("#objection img"),
  resetButton: document.getElementById("resetButton"),
  startOverlay: document.getElementById("startOverlay"),
};

// Audio Functions
async function initAudio() {
  if (!window.isSecureContext) {
    dom.message.textContent = "Please use HTTPS for microphone access";
    return;
  }

  try {
    state.audio.context = new (window.AudioContext ||
      window.webkitAudioContext)();
    state.audio.analyser = state.audio.context.createAnalyser();
    state.audio.dataArray = new Uint8Array(state.audio.analyser.fftSize);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.audio.context
      .createMediaStreamSource(stream)
      .connect(state.audio.analyser);
    await loadSoundBuffers();

    dom.message.style.display = "none";
    dom.startOverlay.style.display = "none"; // Hide entire overlay instead
    setInterval(checkVolume, 100);
  } catch (err) {
    dom.message.textContent =
      err.name === "NotAllowedError"
        ? "Please allow microphone access"
        : `Error: ${err.message}`;
  }
}

async function loadSoundBuffers() {
  await Promise.all(
    CONFIG.SOUNDS.map(async (sound) => {
      const response = await fetch(`assets/sfx/${sound}`);
      const buffer = await response.arrayBuffer();
      state.audio.buffers[sound] = await state.audio.context.decodeAudioData(
        buffer
      );
    })
  );
  state.audio.initialized = true;
}

// UI Functions
function updateSlider(element, value, isThreshold = false) {
  const percentage = isThreshold
    ? ((value - CONFIG.THRESHOLD_RANGE.MIN) /
        (CONFIG.THRESHOLD_RANGE.MAX - CONFIG.THRESHOLD_RANGE.MIN)) *
      100
    : value;
  element.style.background = `linear-gradient(to right, var(--accent-color) 0%, var(--accent-color) ${percentage}%, var(--bg-color) ${percentage}%)`;
  return percentage;
}

function updateSettings(key, value) {
  if (key === "volume") {
    state.settings[key] = parseInt(dom.controls.volume.value);
  } else {
    state.settings[key] = value;
  }
  localStorage.setItem(CONFIG.SETTINGS_KEY, JSON.stringify(state.settings));
}

function convertToLogScale(value) {
  const minValue = 0.0001;
  const maxValue = 1;
  const exp = 3;
  return minValue + (maxValue - minValue) * Math.pow(value / 100, exp);
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONFIG.SETTINGS_KEY)) || {};
    Object.assign(state.settings, saved);

    // Apply saved settings
    if (saved.language) setLanguage(saved.language);
    if (saved.threshold !== undefined) {
      dom.controls.threshold.value = saved.threshold;
      updateThresholdSlider(saved.threshold);
    }
    if (saved.volume !== undefined) {
      dom.controls.volume.value = saved.volume;
      updateVolumeSlider(saved.volume);
    }
    if (saved.character) {
      state.settings.character = saved.character;
      dom.controls.character.value = saved.character;
    }
    if (saved.theme) {
      setTheme(saved.theme);
      dom.controls.theme.value = saved.theme;
    }
  } catch (error) {
    console.error("Error loading settings:", error);
  }
}

// Event Handlers
function resetApp() {
  // Clear localStorage
  localStorage.removeItem(CONFIG.SETTINGS_KEY);

  // Reset sliders to defaults
  dom.controls.volume.value = 100;
  dom.controls.threshold.value = CONFIG.THRESHOLD_RANGE.DEFAULT;
  dom.controls.language.value = "en";
  dom.controls.character.value = "random";
  dom.controls.theme.value = "simple-dark";

  // Update UI
  updateVolumeSlider(100);
  updateThresholdSlider(CONFIG.THRESHOLD_RANGE.DEFAULT);
  setLanguage("en");
  setTheme("simple-dark");

  // Clear cache and reload
  if ("caches" in window) {
    caches.delete("slam2object-cache").then(() => {
      window.location.reload();
    });
  } else {
    window.location.reload();
  }
}

function initEventListeners() {
  dom.controls.volume.addEventListener("input", (e) =>
    updateVolumeSlider(e.target.value)
  );
  dom.controls.threshold.addEventListener("input", (e) =>
    updateThresholdSlider(e.target.value)
  );
  dom.controls.language.addEventListener("change", (e) =>
    setLanguage(e.target.value)
  );
  dom.controls.character.addEventListener("change", (e) => {
    state.settings.character = e.target.value;
    updateSettings("character", e.target.value);
  });
  dom.controls.theme.addEventListener("change", (e) =>
    setTheme(e.target.value)
  );
  dom.resetButton.addEventListener("click", resetApp);
}

function updateVolumeSlider(value) {
  updateSlider(dom.controls.volume, value);
  dom.controls.volumeValue.textContent = `${value}%`;
  state.settings.volume = value;
  state.audio.volume = convertToLogScale(value);
  updateSettings("volume", value);
}

function updateThresholdSlider(value) {
  updateSlider(dom.controls.threshold, value, true);
  dom.controls.thresholdValue.textContent = `${value}%`;
  state.settings.threshold = parseInt(value);
  updateSettings("threshold", state.settings.threshold);
}

function setLanguage(lang) {
  if (CONFIG.LANGUAGES.includes(lang)) {
    state.settings.language = lang;
    dom.objectionImage.src = `assets/img/${lang}_objection.png`;
    updateSettings("language", lang);
  }
}

function setTheme(theme) {
  if (CONFIG.THEMES.includes(theme)) {
    let bg = document.querySelector(".background-image");

    // Handle background transitions
    const handleThemeChange = () => {
      // Set theme attribute
      document.documentElement.setAttribute("data-theme", theme);

      // Add new background if court theme
      if (theme === "court") {
        bg = document.createElement("div");
        bg.className = "background-image";
        document.body.appendChild(bg);
        // Force reflow then show
        bg.offsetHeight;
        requestAnimationFrame(() => bg.classList.add("visible"));
      }

      state.settings.theme = theme;
      updateSettings("theme", theme);
    };

    // Remove existing background with transition
    if (bg) {
      bg.classList.remove("visible");
      bg.addEventListener(
        "transitionend",
        () => {
          bg.remove();
          handleThemeChange();
        },
        { once: true }
      );
    } else {
      handleThemeChange();
    }
  }
}

// Core Functionality
function checkVolume() {
  state.audio.analyser.getByteFrequencyData(state.audio.dataArray);
  const current = Math.round((Math.max(...state.audio.dataArray) / 255) * 100);
  dom.currentDb.textContent = current;

  if (current >= state.settings.threshold && state.ready) {
    triggerObjection();
  }
}

async function triggerObjection() {
  state.ready = false;
  dom.objection.style.display = "block";

  try {
    let soundFile;
    if (state.settings.character === "random") {
      soundFile =
        CONFIG.SOUNDS[Math.floor(Math.random() * CONFIG.SOUNDS.length)];
    } else {
      soundFile = `${state.settings.language}_${state.settings.character}.wav`;
    }

    const source = state.audio.context.createBufferSource();
    const gain = state.audio.context.createGain();

    source.buffer = state.audio.buffers[soundFile];
    gain.gain.setValueAtTime(
      convertToLogScale(state.settings.volume),
      state.audio.context.currentTime
    );
    source.connect(gain).connect(state.audio.context.destination);
    source.start(0);
  } catch (error) {
    console.error("Error playing sound:", error);
  }

  setTimeout(() => {
    dom.objection.style.display = "none";
    setTimeout(() => (state.ready = true), CONFIG.COOLDOWN);
  }, 1000);
}

// Initialization
document.addEventListener(
  "click",
  function init() {
    if (!state.audio.context) {
      loadSettings();
      initEventListeners();
      initAudio();
      document.removeEventListener("click", init);
    }
  },
  { once: true }
);
