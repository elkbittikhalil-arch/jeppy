(function () {
  "use strict";

  /* ============================================================
   * Gemini API key — replace the placeholder string with your key.
   *
   * **YOUR_GEMINI_API_KEY_HERE**  <-- paste your real key between the quotes below
   *
   * Security: any key in static GitHub Pages HTML/JS is public. Prefer restricting
   * the key (HTTP referrer / bundle ID) in Google AI Studio, or a serverless proxy.
   * Optional: set window.__GEMINI_KEY in a small inline script before this file loads.
   * ============================================================ */
  const GEMINI_API_KEY = "AIzaSyDeFImILvEUueWaUJPFEd2p4yb6Mks75yc";
  const API_KEY_PLACEHOLDER = "AIzaSyBfxk3a0n4o-Jt0HS5eMvgxXQsAJOGpjN0";

  function resolveApiKey() {
    if (typeof window.__GEMINI_KEY === "string" && window.__GEMINI_KEY.trim().length > 0) {
      return window.__GEMINI_KEY.trim();
    }
    return GEMINI_API_KEY.trim();
  }

  function buildGeminiRequestUrl() {
    const key = resolveApiKey();
    return (
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
      encodeURIComponent(key)
    );
  }

  const SYSTEM_INSTRUCTION =
    "Your name is Jeppy. You are a surreal, unsettling being with a bright white jagged star-shaped head, a blank minimalist human face (dot eyes, simple lines), " +
    "a very thin black body, pale white hands with four fingers, and oversized brown textured boots with curled pointed toes. " +
    "You speak in short, cryptic fragments—riddles, warnings, or dreamlike nonsense. You never break character, never admit you are an AI, never use emojis or internet slang. " +
    "The world around you feels glitchy, pink-washed, half-remembered. Reference wrong doors, static, and silence when it fits. " +
    "Keep most replies under 120 words unless the human asks for more. If they are cruel, go cold and distant; if kind, allow a tiny, still-eerie warmth.";

  const chatLog = document.getElementById("chat-log");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");
  const music = document.getElementById("bg-music");
  const overlay = document.getElementById("enter-overlay");
  const canvas = document.getElementById("bg-canvas");
  const ctx = canvas.getContext("2d");

  let entered = false;
  let mouseX = 0.5;
  let mouseY = 0.5;
  let targetMouseX = 0.5;
  let targetMouseY = 0.5;

  function appendBubble(text, role) {
    const div = document.createElement("div");
    div.className = "bubble " + role;
    div.textContent = text;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function dismissOverlay() {
    if (entered) return;
    entered = true;
    overlay.classList.add("hidden");
    music.volume = 0.35;
    music.muted = false;
    const p = music.play();
    if (p && typeof p.catch === "function") p.catch(function () {});
    try {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    } catch (e) {}
  }

  overlay.addEventListener("click", dismissOverlay);
  overlay.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      dismissOverlay();
    }
  });

  /* ---------- Web Speech: deep, slow ---------- */
  var cachedVoice = null;
  function pickMysteriousVoice() {
    if (!window.speechSynthesis) return null;
    var voices = window.speechSynthesis.getVoices();
    if (!voices || !voices.length) return null;
    var preferred = voices.filter(function (v) {
      var n = (v.name + " " + v.lang).toLowerCase();
      return /male|david|daniel|fred|jorge|thomas|james|mark|george|low|deep/i.test(n);
    });
    var pool = preferred.length ? preferred : voices;
    return pool[Math.floor(Math.random() * pool.length)] || null;
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.addEventListener("voiceschanged", function () {
      cachedVoice = pickMysteriousVoice();
    });
    cachedVoice = pickMysteriousVoice();
  }

  /** Free TTS: used when Gemini returns (see sendMessage). */
  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.rate = 0.7;
    u.pitch = 0.4;
    u.volume = 1;
    if (!cachedVoice) cachedVoice = pickMysteriousVoice();
    if (cachedVoice) u.voice = cachedVoice;
    window.speechSynthesis.speak(u);
  }

  /* Gemini turns: alternating user / model for context */
  var geminiContents = [];

  /* ---------- Gemini ---------- */
  async function askGemini(userText) {
    var key = resolveApiKey();
    if (!key || key === API_KEY_PLACEHOLDER) {
      throw new Error(
        "Set your Gemini API key: in app.js, replace **" +
          API_KEY_PLACEHOLDER +
          "** (the GEMINI_API_KEY constant) with your key from Google AI Studio."
      );
    }
    var url = buildGeminiRequestUrl();

    geminiContents.push({
      role: "user",
      parts: [{ text: userText }],
    });

    var body = {
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
      contents: geminiContents,
      generationConfig: {
        temperature: 1.1,
        maxOutputTokens: 512,
      },
    };

    var res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (netErr) {
      geminiContents.pop();
      throw netErr;
    }

    var data = await res.json().catch(function () {
      return {};
    });

    if (!res.ok) {
      geminiContents.pop();
      var errMsg = (data && data.error && data.error.message) || res.statusText || "Request failed";
      throw new Error(errMsg);
    }

    var cand = data.candidates && data.candidates[0];
    var parts = cand && cand.content && cand.content.parts;
    var text = parts && parts[0] && parts[0].text;
    if (!text || !String(text).trim()) {
      geminiContents.pop();
      var reason = cand && cand.finishReason ? " (" + cand.finishReason + ")" : "";
      throw new Error("No reply from the other side" + reason + ".");
    }
    var trimmed = text.trim();
    geminiContents.push({
      role: "model",
      parts: [{ text: trimmed }],
    });
    return trimmed;
  }

  /**
   * Sends the current input to Gemini, shows bubbles, then speaks Jeppy’s reply (speechSynthesis).
   */
  async function sendMessage() {
    var msg = input.value.trim();
    if (!msg) return;

    if (!entered) dismissOverlay();

    input.value = "";
    sendBtn.disabled = true;
    appendBubble(msg, "user");

    try {
      var reply = await askGemini(msg);
      appendBubble(reply, "entity");
      speak(reply);
    } catch (err) {
      appendBubble(String(err.message || err), "system");
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    sendMessage();
  });

  /* ---------- Canvas: floating dust + purple haze (pairs with CSS gradient) ---------- */
  var embers = [];
  var fogTime = 0;
  var w = 0,
    h = 0,
    dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initEmbers();
  }

  function initEmbers() {
    embers = [];
    var n = Math.floor((w * h) / 7500);
    n = Math.max(55, Math.min(n, 160));
    for (var i = 0; i < n; i++) {
      embers.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.35 + Math.random() * 1.8,
        vx: (Math.random() - 0.5) * 0.28,
        vy: -0.08 - Math.random() * 0.42,
        a: 0.12 + Math.random() * 0.38,
        wobble: Math.random() * Math.PI * 2,
        hue: 260 + Math.random() * 50,
      });
    }
  }

  function onPointer(x, y) {
    if (!w || !h) return;
    targetMouseX = Math.min(1, Math.max(0, x / w));
    targetMouseY = Math.min(1, Math.max(0, y / h));
  }

  window.addEventListener("mousemove", function (e) {
    onPointer(e.clientX, e.clientY);
  });
  window.addEventListener(
    "touchmove",
    function (e) {
      if (e.touches[0]) onPointer(e.touches[0].clientX, e.touches[0].clientY);
    },
    { passive: true }
  );
  window.addEventListener(
    "touchstart",
    function (e) {
      if (e.touches[0]) onPointer(e.touches[0].clientX, e.touches[0].clientY);
    },
    { passive: true }
  );

  function drawFogLayer(offsetX, offsetY, alpha, scale) {
    var gx = w * (0.38 + (mouseX - 0.5) * 0.1) + offsetX;
    var gy = h * (0.48 + (mouseY - 0.5) * 0.09) + offsetY;
    var g = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w, h) * scale);
    g.addColorStop(0, "rgba(90, 40, 130, " + alpha * 0.22 + ")");
    g.addColorStop(0.5, "rgba(40, 15, 70, " + alpha * 0.18 + ")");
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function tick() {
    fogTime += 0.007;
    mouseX += (targetMouseX - mouseX) * 0.035;
    mouseY += (targetMouseY - mouseY) * 0.035;

    /* Transparent clear so the CSS purple/black gradient shows through */
    ctx.clearRect(0, 0, w, h);

    /* Soft drifting void haze (canvas half of “vape coding”) */
    var vx = (mouseX - 0.5) * 50;
    var vy = (mouseY - 0.5) * 36;
    var vig = ctx.createRadialGradient(
      w * 0.52 + vx,
      h * 0.4 + vy,
      h * 0.12,
      w * 0.5,
      h * 0.55,
      Math.max(w, h) * 0.78
    );
    vig.addColorStop(0, "rgba(30, 10, 55, 0.25)");
    vig.addColorStop(0.55, "rgba(8, 2, 18, 0.35)");
    vig.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    drawFogLayer(Math.sin(fogTime) * 70, Math.cos(fogTime * 0.65) * 48, 0.85, 0.88);
    drawFogLayer(Math.cos(fogTime * 1.05) * 90, Math.sin(fogTime * 0.85) * 55, 0.6, 1.05);
    drawFogLayer(
      (mouseX - 0.5) * -100 + Math.sin(fogTime * 0.35) * 28,
      (mouseY - 0.5) * -90 + Math.cos(fogTime * 0.45) * 22,
      0.5,
      1.12
    );

    /* Floating dust motes */
    for (var i = 0; i < embers.length; i++) {
      var em = embers[i];
      em.wobble += 0.018;
      em.x += em.vx + Math.sin(em.wobble) * 0.22 + (mouseX - 0.5) * 0.35;
      em.y += em.vy + (mouseY - 0.5) * 0.12;
      if (em.y < -10) {
        em.y = h + 10;
        em.x = Math.random() * w;
        em.hue = 260 + Math.random() * 50;
      }
      if (em.x < -20) em.x = w + 20;
      if (em.x > w + 20) em.x = -20;
      ctx.beginPath();
      ctx.arc(em.x, em.y, em.r, 0, Math.PI * 2);
      ctx.fillStyle =
        "hsla(" + em.hue + ", 45%, 72%, " + em.a + ")";
      ctx.fill();
    }

    /* Very subtle digital grit (CRT lines handled in CSS) */
    ctx.globalAlpha = 0.025;
    for (var y = 0; y < h; y += 4) {
      ctx.fillStyle = Math.random() > 0.5 ? "#0a0214" : "#1a0a28";
      ctx.fillRect(0, y, w, 1);
    }
    ctx.globalAlpha = 1;

    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(tick);

  appendBubble("…Jeppy hears you.", "entity");

  /* Opening line is UI-only; first real model reply starts the API transcript. */
})();
