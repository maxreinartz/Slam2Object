let audioContext;
let analyser;
let dataArray;
let currentDbElement = document.getElementById("currentDb");
let objectionElement = document.getElementById("objection");
let startMessageElement = document.getElementById("startMessage");
let threshold = 70; // dB threshold for "Objection"
let interval = 100; // Update interval in milliseconds

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

// Initialize audio on user interaction
document.addEventListener(
  "click",
  function initOnClick() {
    if (!audioContext) {
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
  objectionElement.style.display = "block";
  setTimeout(() => {
    objectionElement.style.display = "none";
  }, 1000);
}
