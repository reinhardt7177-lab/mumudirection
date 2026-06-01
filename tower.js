// 무무가리킴 — 탑 시각화 · 진행 저장 · 화면 라우팅 · 소리

const STORE_KEY = "mumudirection.progress.v1";
const MUTE_KEY = "mumudirection.muted";

const App = {
  progress: {}, // { "1:scene": true, ... }
  muted: false,

  load() {
    try {
      this.progress = JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    } catch {
      this.progress = {};
    }
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      this.muted = false;
    }
  },
  setMuted(v) {
    this.muted = v;
    try { localStorage.setItem(MUTE_KEY, v ? "1" : "0"); } catch {}
  },
  save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(this.progress));
    } catch {
      /* 저장 실패해도 게임은 계속 */
    }
  },
  reset() {
    this.progress = {};
    this.save();
  },

  key: (floorId, mode) => `${floorId}:${mode}`,
  isDone(floorId, mode) {
    return !!this.progress[this.key(floorId, mode)];
  },
  markDone(floorId, mode) {
    this.progress[this.key(floorId, mode)] = true;
    this.save();
  },
  floorComplete(floor) {
    return MODES.every((m) => this.isDone(floor.id, m.key));
  },
  allComplete() {
    return FLOORS.every((f) => this.floorComplete(f));
  },

  // 층 잠금: 1층은 항상 열림, 이후 층은 앞 층 완성 시 열림
  isFloorUnlocked(index) {
    if (index === 0) return true;
    return this.floorComplete(FLOORS[index - 1]);
  },
  // 모드 잠금: 층이 열려 있고, 첫 모드이거나 앞 모드가 끝났을 때
  isModeUnlocked(floor, floorIndex, modeIndex) {
    if (!this.isFloorUnlocked(floorIndex)) return false;
    if (modeIndex === 0) return true;
    return this.isDone(floor.id, MODES[modeIndex - 1].key);
  },

  // 화면 전환
  show(screenId) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("is-active"));
    document.getElementById(screenId).classList.add("is-active");
    window.scrollTo(0, 0);
  },
};

// ===== 소리 (Web Audio, 자산 없음) =====
const Sound = {
  ctx: null,
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    return this.ctx;
  },
  beep(freq, dur, type = "sine", when = 0, gain = 0.15) {
    if (App.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  },
  correct() { this.beep(660, 0.12); this.beep(880, 0.16, "sine", 0.1); },
  wrong() { this.beep(220, 0.18, "triangle", 0, 0.12); },
  combo(n) {
    const base = 700 + Math.min(n, 6) * 70;
    this.beep(base, 0.1, "sine", 0, 0.14);
    this.beep(base * 1.25, 0.12, "sine", 0.07, 0.14);
  },
  fanfare() {
    [523, 659, 784, 1047].forEach((f, i) => this.beep(f, 0.22, "sine", i * 0.12, 0.18));
  },
};

// ===== 읽어주기 (Web Speech API, 선택 기능) =====
const Speech = {
  supported() { return typeof window !== "undefined" && "speechSynthesis" in window; },
  say(text) {
    if (!this.supported() || !text) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ko-KR";
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    } catch {}
  },
};

// 읽어주기 버튼 (미지원 브라우저면 null → 버튼 미표시)
function ttsButton(getText, label = "🔊") {
  if (!Speech.supported()) return null;
  const b = document.createElement("button");
  b.className = "btn btn-ghost tts-btn";
  b.type = "button";
  b.textContent = label;
  b.setAttribute("aria-label", "소리로 듣기");
  b.addEventListener("click", () => Speech.say(typeof getText === "function" ? getText() : getText));
  return b;
}

// ===== 탑 렌더링 =====
function renderTower(targetEl, { trophy = false } = {}) {
  targetEl.innerHTML = "";
  // 탑 페이지: tower-bg 이미지가 있으면 그림 + 층 라벨(탭→모드) 방식
  if (!trophy && targetEl.id === "towerWrap" && typeof Sprites !== "undefined" && Sprites.has("towerbg")) {
    renderTowerImage(targetEl);
    updateTowerBanner();
    updateStarBoard();
    updateMixedButton();
    return;
  }
  FLOORS.forEach((floor, fIdx) => {
    const unlocked = App.isFloorUnlocked(fIdx);
    const cleared = App.floorComplete(floor);

    const floorEl = document.createElement("div");
    floorEl.className = "floor" + (unlocked ? "" : " locked");
    floorEl.dataset.floor = floor.id;

    const head = document.createElement("div");
    head.className = "floor-head";
    const badgeChip = cleared
      ? `<span class="badge-chip">${floor.badge.icon} ${floor.badge.name}</span>`
      : "";
    head.innerHTML =
      `<div><span class="floor-name">${floor.name}</span>` +
      `<div class="floor-scope">${floor.scope}</div>${badgeChip}</div>` +
      `<span class="floor-mumu" aria-hidden="true">${cleared ? "🧑‍🚀🎉" : unlocked ? "🧑‍🚀" : "🔒"}</span>`;
    floorEl.appendChild(head);

    if (trophy) {
      // 트로피 화면: 완성 단어 칩만 보여줌
      const chips = document.createElement("div");
      chips.className = "blocks";
      MODES.forEach((m) => {
        const b = document.createElement("div");
        b.className = "block done";
        b.innerHTML = `<span class="block-icon">${m.icon}</span>${m.name}<span class="block-check">✓</span>`;
        chips.appendChild(b);
      });
      floorEl.appendChild(chips);
      targetEl.appendChild(floorEl);
      return;
    }

    const blocks = document.createElement("div");
    blocks.className = "blocks";
    MODES.forEach((mode, mIdx) => {
      const done = App.isDone(floor.id, mode.key);
      const modeUnlocked = App.isModeUnlocked(floor, fIdx, mIdx);
      const btn = document.createElement("button");
      btn.className = "block" + (done ? " done" : "");
      btn.dataset.floor = floor.id;
      btn.dataset.mode = mode.key;
      btn.disabled = !modeUnlocked;
      const lock = !modeUnlocked ? " 🔒" : "";
      btn.innerHTML =
        `<span class="block-icon" aria-hidden="true">${mode.icon}</span>` +
        `<span>${mode.name}${lock}</span>` +
        (done ? `<span class="block-check" aria-hidden="true">✓</span>` : "");
      btn.setAttribute(
        "aria-label",
        `${floor.name} ${mode.name}${done ? " 완료" : modeUnlocked ? "" : " 잠김"}`
      );
      if (modeUnlocked) {
        btn.addEventListener("click", () => Game.start(fIdx, mIdx));
      }
      blocks.appendChild(btn);
    });
    floorEl.appendChild(blocks);
    targetEl.appendChild(floorEl);
  });
  if (targetEl.id === "towerWrap") {
    updateTowerBanner();
    updateStarBoard();
    updateMixedButton();
  }
}

// ===== 탑 페이지(그림 + 층 라벨 → 모드 펼치기) =====
let _selectedFloor = -1;

function renderTowerImage(targetEl) {
  const stage = document.createElement("div");
  stage.className = "tower-stage";
  stage.style.backgroundImage = `url('${SHEETS.towerbg.src}')`;

  // 층 라벨 세로 위치: index 0=1층(아래) · 1=2층(중간) · 2=3층(위)
  const tops = ["75%", "47%", "17%"];
  FLOORS.forEach((floor, fIdx) => {
    const unlocked = App.isFloorUnlocked(fIdx);
    const cleared = App.floorComplete(floor);
    const doneCount = MODES.filter((m) => App.isDone(floor.id, m.key)).length;

    const btn = document.createElement("button");
    btn.className = "tier-label" + (unlocked ? "" : " locked") + (cleared ? " cleared" : "");
    btn.style.top = tops[fIdx];
    btn.disabled = !unlocked;
    btn.innerHTML =
      `<span class="tier-name">${floor.name}</span>` +
      `<span class="tier-state">${cleared ? `${floor.badge.icon} 완성` : unlocked ? `${doneCount}/4` : "🔒 잠김"}</span>`;
    btn.setAttribute("aria-label", `${floor.name} ${cleared ? "완성" : unlocked ? doneCount + "/4 진행" : "잠김"}`);
    if (unlocked) btn.addEventListener("click", () => selectFloor(fIdx));
    stage.appendChild(btn);
  });
  targetEl.appendChild(stage);

  const panel = document.createElement("div");
  panel.className = "floor-modes";
  panel.id = "floorModes";
  panel.hidden = true;
  targetEl.appendChild(panel);

  // 직전에 보던 층이 있으면 다시 펼쳐 진행 상태를 보여줌
  if (_selectedFloor >= 0 && App.isFloorUnlocked(_selectedFloor)) selectFloor(_selectedFloor);
}

function selectFloor(fIdx) {
  _selectedFloor = fIdx;
  const floor = FLOORS[fIdx];
  const panel = document.getElementById("floorModes");
  if (!panel) return;
  panel.hidden = false;
  panel.innerHTML = `<div class="fm-head">${floor.name} · ${floor.scope}</div>`;

  const grid = document.createElement("div");
  grid.className = "fm-grid";
  MODES.forEach((mode, mIdx) => {
    const done = App.isDone(floor.id, mode.key);
    const modeUnlocked = App.isModeUnlocked(floor, fIdx, mIdx);
    const btn = document.createElement("button");
    btn.className = "block" + (done ? " done" : "");
    btn.dataset.floor = floor.id;
    btn.dataset.mode = mode.key;
    btn.disabled = !modeUnlocked;
    const lock = !modeUnlocked ? " 🔒" : "";
    btn.innerHTML =
      `<span class="block-icon" aria-hidden="true">${mode.icon}</span>` +
      `<span>${mode.name}${lock}</span>` +
      (done ? `<span class="block-check" aria-hidden="true">✓</span>` : "");
    btn.setAttribute("aria-label", `${floor.name} ${mode.name}${done ? " 완료" : modeUnlocked ? "" : " 잠김"}`);
    if (modeUnlocked) btn.addEventListener("click", () => Game.start(fIdx, mIdx));
    grid.appendChild(btn);
  });
  panel.appendChild(grid);

  document.querySelectorAll(".tier-label").forEach((el, i) => el.classList.toggle("active", i === fIdx));
}

// 성장 탑 이미지 배너(이미지 있을 때만 표시)
function updateTowerBanner() {
  const el = document.getElementById("towerBanner");
  if (!el) return;
  const html = Sprites.towerImg(Sprites.towerFrame(), 200);
  el.innerHTML = html || "";
  el.style.display = html ? "" : "none";
}

// 별 수집판 — 완료한 모드 수만큼 별
function updateStarBoard() {
  const el = document.getElementById("starBoard");
  if (!el) return;
  const total = FLOORS.length * MODES.length;
  let done = 0;
  FLOORS.forEach((f) => MODES.forEach((m) => { if (App.isDone(f.id, m.key)) done++; }));
  let stars = "";
  for (let i = 0; i < total; i++) stars += `<span class="star ${i < done ? "on" : ""}">${i < done ? "⭐" : "☆"}</span>`;
  el.innerHTML = `<span class="star-count">⭐ ${done} / ${total}</span><span class="star-row">${stars}</span>`;
}

// 랜덤 섞기 도전 버튼 — 전 층 완성 시에만 노출
function updateMixedButton() {
  const btn = document.getElementById("mixedBtn");
  if (!btn) return;
  btn.hidden = !App.allComplete();
}

// 방금 완료한 블록 '탁' 끼우기 연출
function snapBlock(floorId, modeKey) {
  const block = document.querySelector(`.block[data-floor="${floorId}"][data-mode="${modeKey}"]`);
  if (!block) return;
  block.classList.remove("fill");
  void block.offsetWidth; // 리플로우로 애니메이션 재시작
  block.classList.add("fill");
}

// 시트 로드 후 정적 무무(랜딩·축하)를 스프라이트로 교체
function applySprites() {
  // 랜딩 배경 = 수채화 탑 그림 (제목은 위에 오버레이)
  const art = document.getElementById("landingArt");
  if (art) {
    if (Sprites.has("landing")) {
      art.style.backgroundImage = `url('${SHEETS.landing.src}')`;
      art.classList.remove("no-art");
    } else {
      art.classList.add("no-art");
    }
  }
  if (Sprites.has("mumu")) {
    const ch = document.getElementById("celebrateHero");
    if (ch) ch.innerHTML = Sprites.face("mumu", "cheering", { cls: "hero-face", size: 96 });
  }
  updateTowerBanner();
}

// ===== 초기화 / DOM 배선 =====
document.addEventListener("DOMContentLoaded", () => {
  App.load();
  Sprites.detect().then(applySprites);

  document.getElementById("startLine").textContent = MUMU_LINES.start;

  const resetBtn = document.getElementById("resetBtn");
  if (Object.keys(App.progress).length > 0) resetBtn.hidden = false;

  document.getElementById("startBtn").addEventListener("click", () => {
    Sound.ensure(); // 사용자 제스처에서 오디오 활성화
    renderTower(document.getElementById("towerWrap"));
    App.show("tower");
  });

  resetBtn.addEventListener("click", () => {
    App.reset();
    resetBtn.hidden = true;
    renderTower(document.getElementById("towerWrap"));
  });

  document.getElementById("towerBack").addEventListener("click", () => App.show("landing"));
  document.getElementById("gameBack").addEventListener("click", () => {
    renderTower(document.getElementById("towerWrap"));
    App.show("tower");
  });
  document.getElementById("celebrateHome").addEventListener("click", () => {
    renderTower(document.getElementById("towerWrap"));
    App.show("tower");
  });

  // 랜덤 섞기 도전
  const mixedBtn = document.getElementById("mixedBtn");
  if (mixedBtn) mixedBtn.addEventListener("click", () => Game.startMixed());

  // 효과음 토글
  const muteBtn = document.getElementById("muteBtn");
  if (muteBtn) {
    const paint = () => {
      muteBtn.textContent = App.muted ? "🔇 소리 꺼짐" : "🔊 소리 켜짐";
      muteBtn.setAttribute("aria-pressed", App.muted ? "true" : "false");
    };
    paint();
    muteBtn.addEventListener("click", () => {
      Sound.ensure();
      App.setMuted(!App.muted);
      paint();
      if (!App.muted) Sound.correct(); // 켜짐 확인음
    });
  }
});

// game.js에서 호출
function showCelebration() {
  document.getElementById("celebrateLine").textContent = MUMU_LINES.allClear;
  renderTower(document.getElementById("trophyTower"), { trophy: true });
  renderCertificate();
  Sound.fanfare();
  App.show("celebrate");
}

// 완성 인증서 — 획득 배지 + 날짜
function renderCertificate() {
  const badgesEl = document.getElementById("certBadges");
  if (badgesEl) {
    badgesEl.innerHTML = FLOORS.map(
      (f) => `<span class="cert-badge"><span class="cert-ico">${f.badge.icon}</span><span class="cert-name">${f.badge.name}</span></span>`
    ).join("");
  }
  const dateEl = document.getElementById("certDate");
  if (dateEl) {
    const d = new Date();
    const z = (n) => String(n).padStart(2, "0");
    dateEl.textContent = `${d.getFullYear()}년 ${z(d.getMonth() + 1)}월 ${z(d.getDate())}일 완성`;
  }
}
