// 무무가리킴 — 스프라이트 시트 슬라이싱 (이미지 있으면 칸을 잘라 쓰고, 없으면 이모지로 폴백)

// 시트 규격: cols×rows. 단일 배경은 cols:1,rows:1.
const SHEETS = {
  mumu:    { src: "assets/mumu-sheet.png",    cols: 3, rows: 2 },
  friend:  { src: "assets/friend.png",        cols: 2, rows: 1 },
  tower:   { src: "assets/tower-sheet.png",   cols: 4, rows: 1 },
  obj:     { src: "assets/items-objects.png", cols: 4, rows: 3 },
  place:   { src: "assets/items-places.png",  cols: 4, rows: 3 },
  noun:    { src: "assets/items-nouns.png",   cols: 4, rows: 3 },
  sky:     { src: "assets/sky-bg.png",        cols: 1, rows: 1 },
  outdoor: { src: "assets/stage-outdoor.png", cols: 1, rows: 1 },
  indoor:  { src: "assets/stage-indoor.png",  cols: 1, rows: 1 },
  landing: { src: "assets/landing-hero.png",  cols: 1, rows: 1 }, // 랜딩 배경
  towerbg: { src: "assets/tower-bg.png",      cols: 1, rows: 1 }, // 탑 페이지 배경
  stage:   { src: "assets/stage-bg.png",      cols: 1, rows: 1 }, // 게임 무대 배경판
};

// 무무 표정 칸(0-indexed): 밝음·놀람·집중·슬픔·응원·등반
const MUMU_FACE = { happy: 0, surprised: 1, thinking: 2, sad: 3, cheering: 4, climbing: 5 };
// 친구 칸: 보통·손흔들기
const FRIEND_FACE = { neutral: 0, waving: 1 };

const Sprites = {
  ok: {},

  detect() {
    return Promise.all(
      Object.keys(SHEETS).map(
        (k) =>
          new Promise((res) => {
            const img = new Image();
            img.onload = () => { this.ok[k] = img.naturalWidth > 0; SHEETS[k].nw = img.naturalWidth; SHEETS[k].nh = img.naturalHeight; res(); };
            img.onerror = () => { this.ok[k] = false; res(); };
            img.src = SHEETS[k].src;
          })
      )
    );
  },

  has(key) { return !!this.ok[key]; },

  // 한 칸을 w×h로 잘라내는 인라인 스타일
  cellStyle(key, cell, w, h) {
    const s = SHEETS[key];
    const col = cell % s.cols;
    const row = Math.floor(cell / s.cols);
    return (
      `background-image:url('${s.src}');` +
      `background-size:${s.cols * w}px ${s.rows * h}px;` +
      `background-position:-${col * w}px -${row * h}px;` +
      `background-repeat:no-repeat;width:${w}px;height:${h}px;`
    );
  },

  // 인물 얼굴 HTML (sprite 또는 이모지 폴백)
  face(who, emotion, { cls = "face", size = 56 } = {}) {
    if (who === "mumu" && this.has("mumu")) {
      const c = MUMU_FACE[emotion] ?? 0;
      return `<span class="${cls} sprite" aria-hidden="true" style="${this.cellStyle("mumu", c, size, size)}"></span>`;
    }
    if (who === "chingu" && this.has("friend")) {
      const c = FRIEND_FACE[emotion] ?? 0;
      return `<span class="${cls} sprite" aria-hidden="true" style="${this.cellStyle("friend", c, size, size)}"></span>`;
    }
    return `<span class="${cls}" aria-hidden="true">${who === "mumu" ? "🧑‍🚀" : "🧒"}</span>`;
  },

  // 사물 HTML (sprite 또는 이모지 폴백)
  item(floor, item, size = 64) {
    if (floor.sheet && item.cell != null && this.has(floor.sheet)) {
      return `<span class="emoji sprite" aria-hidden="true" style="${this.cellStyle(floor.sheet, item.cell, size, size)}"></span>`;
    }
    return `<span class="emoji" aria-hidden="true">${item.emoji}</span>`;
  },

  // 칸의 가로:세로 비율 (시트 실제 크기 기준, 없으면 1)
  cellAspect(key) {
    const s = SHEETS[key];
    if (!s.nw || !s.nh) return 1;
    return (s.nw / s.cols) / (s.nh / s.rows);
  },

  // 무대용 전신/반신 캐릭터 (액자형, 비율 보정). 이미지 없으면 null
  actor(who, emotion, h = 96) {
    const sheet = who === "mumu" ? "mumu" : "friend";
    if (!this.has(sheet)) return null;
    const map = who === "mumu" ? MUMU_FACE : FRIEND_FACE;
    const cell = map[emotion] ?? 0;
    const w = Math.round(h * this.cellAspect(sheet));
    return `<span class="actor-art" aria-hidden="true" style="${this.cellStyle(sheet, cell, w, h)}"></span>`;
  },

  // 무대 배경 스타일 (배경판 → 야외 → 하늘 순, 없으면 빈 문자열 = CSS 색면 유지)
  stageBg() {
    const key = this.has("stage") ? "stage" : this.has("outdoor") ? "outdoor" : this.has("sky") ? "sky" : null;
    if (!key) return "";
    return `background-image:url('${SHEETS[key].src}');background-size:cover;background-position:center;`;
  },

  // 완성한 층 수(0~3) → 탑 성장 프레임
  towerFrame() {
    let n = 0;
    FLOORS.forEach((f) => { if (App.floorComplete(f)) n++; });
    return n;
  },

  // 성장 탑 이미지 HTML (없으면 null)
  towerImg(frame, w = 200) {
    if (!this.has("tower")) return null;
    const h = Math.round((w * 520) / 320);
    return `<div class="tower-img" aria-hidden="true" style="${this.cellStyle("tower", frame, w, h)}"></div>`;
  },
};
