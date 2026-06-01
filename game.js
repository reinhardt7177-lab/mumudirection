// 무무가리킴 — 4개 게임 모드 컨트롤러 (+ 콤보·교정·힌트·복습·랜덤 챌린지)

const Game = {
  floor: null,
  floorIndex: 0,
  mode: null, // MODES 항목
  steps: [],
  idx: 0,
  streak: 0,
  wrongThisStep: false,
  missed: [],
  missedKeys: null,
  reviewMode: false,
  mixedMode: false,
  mixedCorrect: 0,

  _reset() {
    this.idx = 0;
    this.streak = 0;
    this.wrongThisStep = false;
    this.missed = [];
    this.missedKeys = new Set();
  },

  start(floorIndex, modeIndex) {
    this.floorIndex = floorIndex;
    this.floor = FLOORS[floorIndex];
    this.mode = MODES[modeIndex];
    this.reviewMode = false;
    this.mixedMode = false;
    this.steps = buildSteps(this.floor, this.mode.key);
    this._reset();

    document.getElementById("gameTitle").textContent = `${this.floor.name} · ${this.mode.name}`;
    App.show("game");
    this.renderStep();
  },

  // 랜덤 섞기 도전 — 전 층·모드에서 무작위 출제
  startMixed() {
    this.floor = null;
    this.mode = null;
    this.reviewMode = false;
    this.mixedMode = true;
    this.mixedCorrect = 0;
    this.steps = buildMixedSteps(8);
    this._reset();

    document.getElementById("gameTitle").textContent = "🎲 랜덤 섞기 도전";
    App.show("game");
    this.renderStep();
  },

  renderStep() {
    hideFeedback();
    this.wrongThisStep = false;
    const step = this.steps[this.idx];
    const body = document.getElementById("gameBody");
    const tag = this.mixedMode ? "도전" : this.reviewMode ? "복습" : "";
    document.getElementById("gameProgress").textContent =
      `${tag ? tag + " " : ""}${this.idx + 1} / ${this.steps.length}`;
    body.innerHTML = "";
    body.appendChild(renderByKind(step));
  },

  // 정답 처리
  answer(clickedBtn, chosen, correct, step) {
    if (chosen !== correct) {
      clickedBtn.classList.add("wrong");
      clickedBtn.disabled = true;
      Sound.wrong();
      this.streak = 0;
      if (!this.wrongThisStep) {
        this.wrongThisStep = true;
        if (!this.missedKeys.has(this.idx)) {
          this.missedKeys.add(this.idx);
          this.missed.push(step);
        }
      }
      showFeedback(false, pick(MUMU_LINES.wrong), misconceptionFor(step, chosen), null);
      return;
    }
    // 정답
    const choiceBox = clickedBtn.closest(".choices");
    if (choiceBox) choiceBox.querySelectorAll(".choice").forEach((b) => (b.disabled = true));
    clickedBtn.classList.add("correct");
    Sound.correct();

    // 콤보 — 첫 시도 연속 정답만 인정
    let combo = "";
    if (!this.wrongThisStep) {
      this.streak++;
      if (this.mixedMode) this.mixedCorrect++;
      if (this.streak >= 2) {
        combo = `${pick(MUMU_LINES.combo)} ${this.streak}연속`;
        Sound.combo(this.streak);
      }
    }

    if (step.kind === "build") showMasterpiece(step, correct);

    const last = this.idx === this.steps.length - 1;
    showFeedback(true, pick(MUMU_LINES.correct), feedbackFor(step, correct), () => {
      if (!last) { this.idx++; this.renderStep(); return; }
      if (this.mixedMode) this.finishMixed();
      else this.finishMode();
    }, combo);
  },

  finishMode() {
    App.markDone(this.floor.id, this.mode.key);
    // 틀린 문항이 있으면 복습 제안 (복습 중엔 다시 묻지 않음)
    if (!this.reviewMode && this.missed.length) { showReviewOffer(); return; }
    this.proceedAfterMode();
  },

  proceedAfterMode() {
    if (App.allComplete()) { showCelebration(); return; }
    hideFeedback();
    renderTower(document.getElementById("towerWrap"));
    App.show("tower");
    snapBlock(this.floor.id, this.mode.key);

    if (App.floorComplete(this.floor)) {
      Sound.fanfare();
      const b = this.floor.badge;
      flashHelp(`${MUMU_LINES.floorClear} 「${b.icon} ${b.name}」 배지 획득!`);
    } else {
      flashHelp("다음 칸이 열렸어! 이어서 해볼까?");
    }
  },

  finishMixed() {
    hideFeedback();
    const body = document.getElementById("gameBody");
    body.innerHTML = "";
    const card = document.createElement("div");
    card.className = "mixed-result pop";
    const total = this.steps.length;
    const got = this.mixedCorrect;
    const cheer = got === total ? "완벽해! 🏆" : got >= total * 0.7 ? "훌륭해! 🎉" : "좋아, 한 번 더?";
    card.innerHTML = `🎲 랜덤 도전 결과<br><b>${got} / ${total}</b> 첫판에 정답!<br><span class="mixed-cheer">${cheer}</span>`;
    body.appendChild(card);
    const back = document.createElement("button");
    back.className = "btn btn-primary";
    back.textContent = "탑으로 돌아가기";
    back.addEventListener("click", () => { renderTower(document.getElementById("towerWrap")); App.show("tower"); });
    body.appendChild(back);
    Sound.fanfare();
  },
};

// 현재 스텝이 속한 층 (랜덤 모드 대비)
function floorOf(step) { return step.floor || Game.floor; }

// ===== 스텝 생성 =====
function buildSteps(floor, modeKey) {
  const data = floor.modes[modeKey];
  let steps;
  if (modeKey === "perspective") {
    steps = [];
    data.forEach((q) => {
      steps.push({ kind: "perspective", item: q.item, side: q.side, speaker: "mumu" });
      steps.push({ kind: "perspective", item: q.item, side: q.side, speaker: "chingu" });
    });
  } else if (modeKey === "dialogue") {
    steps = data.map((q) => ({ kind: "dialogue", ...q }));
  } else {
    steps = data.map((q) => ({ kind: modeKey, item: q.item, pos: q.pos, frame: q.frame }));
  }
  steps.forEach((s) => (s.floor = floor)); // 각 스텝에 소속 층 부착
  return steps;
}

function buildMixedSteps(n) {
  const all = [];
  FLOORS.forEach((f) => MODES.forEach((m) => buildSteps(f, m.key).forEach((s) => all.push(s))));
  // 인덱스 기반 셔플 (Date.now/Math.random 사용 가능 — 브라우저 컨텍스트)
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, n);
}

// ===== 정답 단어 계산 =====
function answerWord(step, floor) {
  if (step.kind === "dialogue") return step.answer;
  if (step.kind === "perspective") {
    if (step.speaker === "mumu") {
      return step.side === "near" ? floor.words.near : floor.words.mid;
    }
    return step.side === "near" ? floor.words.mid : floor.words.near;
  }
  return floor.words[step.pos];
}

// ===== 화면 조각 =====
function renderByKind(step) {
  if (step.kind === "dialogue") return renderDialogue(step);
  if (step.kind === "perspective") return renderPerspective(step);
  return renderScene(step); // scene / build
}

function renderScene(step) {
  const floor = floorOf(step);
  const correct = answerWord(step, floor);
  const wrap = document.createElement("div");

  wrap.appendChild(
    promptRow(
      step.kind === "build"
        ? "장면에 맞게 빈칸을 채워 문장을 완성하자!"
        : "무무 말풍선의 빈칸에 알맞은 말은?"
    )
  );
  wrap.appendChild(buildStage({ objPos: step.pos, speaker: "mumu", item: step.item, frame: step.frame, floor }));
  wrap.appendChild(buildChoices(step, correct));
  addHint(wrap, step);
  return wrap;
}

function renderPerspective(step) {
  const floor = floorOf(step);
  const correct = answerWord(step, floor);
  const speakerName = step.speaker === "mumu" ? "무무" : "친구";
  const wrap = document.createElement("div");

  const p = promptRow("");
  p.querySelector(".q-prompt").innerHTML =
    `같은 ‘${step.item.name}’인데… <b>${speakerName}</b>가 말하면 뭐라고 할까?`;
  wrap.appendChild(p);

  const frame = floor.noun ? `“○○ ${step.item.name} 좀 봐!”` : `“○○ 좀 봐!”`;
  wrap.appendChild(buildStage({ objPos: step.side, speaker: step.speaker, item: step.item, frame, floor }));
  wrap.appendChild(buildChoices(step, correct));
  addHint(wrap, step);
  return wrap;
}

function renderDialogue(step) {
  const floor = floorOf(step);
  const correct = step.answer;
  const wrap = document.createElement("div");

  wrap.appendChild(promptRow("대화 속 단서를 보고 알맞은 말을 골라 봐!"));

  const dia = document.createElement("div");
  dia.className = "dialogue";
  step.lines.forEach((ln, i) => {
    const right = ln.who === "무무";
    const row = document.createElement("div");
    row.className = "line" + (right ? " right" : "") + (i === 0 ? " antecedent" : "");
    const face = right
      ? Sprites.face("mumu", "happy", { cls: "who", size: 34 })
      : Sprites.face("chingu", "neutral", { cls: "who", size: 34 });
    const text = ln.blank ? ln.text.replace("○○", `<span class="blank">○○</span>`) : ln.text;
    const cueHtml = ln.cue ? `<span class="cue">${ln.cue}</span>` : "";
    row.innerHTML = `${face}<span class="say">${cueHtml}${text}</span>`;
    dia.appendChild(row);
  });
  wrap.appendChild(dia);

  const listen = ttsButton(() => step.lines.map((l) => l.text.replace("○○", "음")).join(" "), "🔊 대화 듣기");
  if (listen) wrap.appendChild(listen);

  wrap.appendChild(buildChoices(step, correct));
  addHint(wrap, step);
  return wrap;
}

// 질문 줄 + 읽어주기 버튼
function promptRow(text) {
  const wrap = document.createElement("div");
  wrap.className = "prompt-row";
  const p = document.createElement("p");
  p.className = "q-prompt";
  p.textContent = text;
  wrap.appendChild(p);
  const tts = ttsButton(() => p.textContent, "🔊");
  if (tts) wrap.appendChild(tts);
  return wrap;
}

// 무대(장면) — 거리를 공간으로 표현 + 거리 존
function buildStage({ objPos, speaker, item, frame, floor }) {
  const stage = document.createElement("div");
  stage.className = "stage";
  const bg = Sprites.stageBg();
  if (bg) stage.setAttribute("style", bg);
  const speakingSpeaker = speaker === "mumu";
  const bubbleSide = speakingSpeaker ? "from-speaker" : "from-listener";
  const frameHtml = frame.replace("○○", `<span class="blank">○○</span>`);
  const mumuEmo = speakingSpeaker ? "happy" : "thinking";
  const friendEmo = speakingSpeaker ? "neutral" : "waving";
  const mumuArt = Sprites.actor("mumu", mumuEmo, 178) || Sprites.face("mumu", mumuEmo);
  const friendArt = Sprites.actor("chingu", friendEmo, 152) || Sprites.face("chingu", friendEmo);
  const artCls = Sprites.has("mumu") || Sprites.has("friend") ? " has-art" : "";

  stage.innerHTML =
    `<div class="zone zone-near"><span>무무 가까이</span></div>` +
    `<div class="zone zone-mid"><span>친구 가까이</span></div>` +
    `<div class="zone zone-far"><span>둘 다 먼 곳</span></div>` +
    `<div class="bubble ${bubbleSide}">${frameHtml}</div>` +
    `<div class="actor speaker${artCls} ${speakingSpeaker ? "speaking" : ""}">` +
      `${mumuArt}<span class="tag">무무${speakingSpeaker ? " 💬" : ""}</span></div>` +
    `<div class="actor listener${artCls} ${speakingSpeaker ? "" : "speaking"}">` +
      `${friendArt}<span class="tag">친구${speakingSpeaker ? "" : " 💬"}</span></div>` +
    `<div class="thing pos-${objPos}">${Sprites.item(floor || Game.floor, item)}` +
      `<span class="label">${item.name}</span></div>`;
  return stage;
}

// 보기 버튼 묶음
function buildChoices(step, correct) {
  const floor = floorOf(step);
  const box = document.createElement("div");
  box.className = "choices";
  choicesFor(floor).forEach((word) => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.type = "button";
    btn.textContent = floor.noun ? `${word} ___` : word;
    btn.setAttribute("aria-label", word);
    btn.addEventListener("click", () => Game.answer(btn, word, correct, step));
    box.appendChild(btn);
  });
  return box;
}

// 힌트 버튼 — 페널티 없음
function addHint(wrap, step) {
  const btn = document.createElement("button");
  btn.className = "btn btn-ghost hint-btn";
  btn.type = "button";
  btn.textContent = "💡 거리 힌트";
  btn.addEventListener("click", () => {
    btn.disabled = true;
    if (step.kind === "dialogue") {
      wrap.querySelector(".dialogue")?.classList.add("hint-on");
      showHintTip(wrap, "단서를 봐! 손에 있나·멀리 있나·아까 말했나에 따라 달라져.");
    } else {
      wrap.querySelector(".stage")?.classList.add("hint-on");
      showHintTip(wrap, "물건이 누구 가까이 있는지 살펴봐!");
    }
  });
  wrap.appendChild(btn);
}

function showHintTip(wrap, msg) {
  let tip = wrap.querySelector(".hint-tip");
  if (!tip) {
    tip = document.createElement("p");
    tip.className = "hint-tip";
    wrap.appendChild(tip);
  }
  tip.textContent = "💡 " + msg;
}

// 틀린 문항 복습 제안
function showReviewOffer() {
  hideFeedback();
  const body = document.getElementById("gameBody");
  body.innerHTML = "";
  const panel = document.createElement("div");
  panel.className = "review-panel pop";
  panel.innerHTML = `<p>이 칸에서 헷갈린 문제가 <b>${Game.missed.length}개</b> 있어.<br>한 번 더 풀어볼까?</p>`;
  const row = document.createElement("div");
  row.className = "review-actions";
  const again = document.createElement("button");
  again.className = "btn btn-primary";
  again.textContent = "🔁 다시 풀기";
  again.addEventListener("click", startReview);
  const skip = document.createElement("button");
  skip.className = "btn btn-ghost";
  skip.textContent = "탑으로 가기";
  skip.addEventListener("click", () => { Game.missed = []; Game.proceedAfterMode(); });
  row.appendChild(again);
  row.appendChild(skip);
  panel.appendChild(row);
  body.appendChild(panel);
}

function startReview() {
  Game.reviewMode = true;
  Game.steps = Game.missed.slice();
  Game.missed = [];
  Game.missedKeys = new Set();
  Game.idx = 0;
  Game.streak = 0;
  document.getElementById("gameTitle").textContent = `${Game.floor.name} · 복습`;
  Game.renderStep();
}

// 문장 만들기 — 완성 작품 (+ 읽어주기)
function showMasterpiece(step, correct) {
  const body = document.getElementById("gameBody");
  const old = body.querySelector(".masterpiece");
  if (old) old.remove();
  const sentence = step.frame.replace("○○", correct);
  const card = document.createElement("div");
  card.className = "masterpiece pop";
  card.innerHTML = `🏗️ 내 작품<br>“${sentence}”`;
  body.appendChild(card);

  const tipRow = document.createElement("div");
  tipRow.className = "read-row";
  const tip = document.createElement("p");
  tip.className = "read-tip";
  tip.textContent = "소리 내어 한 번 읽어볼까? 🗣️";
  tipRow.appendChild(tip);
  const tts = ttsButton(() => sentence, "🔊 들어보기");
  if (tts) tipRow.appendChild(tts);
  body.appendChild(tipRow);
}

// ===== 피드백 문구 =====
function feedbackFor(step, correct) {
  const floor = floorOf(step);
  if (step.kind === "dialogue") return step.feedback;
  if (step.kind === "perspective") {
    const who = step.speaker === "mumu" ? "무무" : "친구";
    const where =
      step.speaker === "mumu"
        ? step.side === "near" ? "무무 자기 가까이" : "듣는 친구 가까이"
        : step.side === "near" ? "듣는 무무 가까이" : "친구 자기 가까이";
    return `${who}가 말하면 ‘${step.item.name}’은 ${where} → ‘${correct}’.`;
  }
  return `‘${step.item.name}’이 ${POS_DESC[step.pos]}에 있으니 ‘${correct}’!`;
}

// 오개념 교정 — 고른 답이 왜 틀린지 짚기
function misconceptionFor(step, chosen) {
  const floor = floorOf(step);
  if (step.kind === "dialogue") {
    return `대화 속 단서를 봐 — 손에 있나? 멀리 있나? 아까 말했나? 정답은 ‘${step.answer}’.`;
  }
  const correct = answerWord(step, floor);
  if (step.kind === "perspective") {
    const who = step.speaker === "mumu" ? "무무" : "친구";
    return `지금은 ${who}가 말하는 중! ${who} 기준으로 ‘${step.item.name}’의 거리를 보면 ‘${correct}’야.`;
  }
  const chosenPos = posOfWord(floor, chosen);
  if (chosenPos) {
    return `‘${chosen}’은 ${POS_DESC[chosenPos]}일 때 쓰는 말이야. ‘${step.item.name}’은 ${POS_DESC[step.pos]}에 있지? 그래서 ‘${correct}’.`;
  }
  return feedbackFor(step, correct);
}

// ===== 피드백 오버레이 =====
function showFeedback(ok, headline, detail, onNext, combo) {
  const fb = document.getElementById("feedback");
  fb.className = "feedback " + (ok ? "ok" : "no");
  fb.hidden = false;
  const emotion = ok ? "surprised" : "sad";
  const face = Sprites.has("mumu")
    ? Sprites.face("mumu", emotion, { cls: "fb-face", size: 40 })
    : `<span class="fb-emoji" aria-hidden="true">${ok ? "😮" : "🥺"}</span>`;
  const comboHtml = combo ? `<span class="combo-badge">${combo}</span>` : "";
  fb.innerHTML =
    face +
    `<span class="fb-text">${comboHtml}${headline}${detail ? `<small>${detail}</small>` : ""}</span>`;
  if (ok && onNext) {
    const btn = document.createElement("button");
    btn.className = "btn btn-primary fb-next";
    btn.textContent = "다음 →";
    btn.addEventListener("click", onNext);
    fb.appendChild(btn);
    btn.focus();
  }
}
function hideFeedback() {
  const fb = document.getElementById("feedback");
  fb.hidden = true;
  fb.innerHTML = "";
}

// ===== 유틸 =====
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function flashHelp(msg) {
  const help = document.getElementById("towerHelp");
  if (!help) return;
  help.textContent = msg;
  help.style.color = "var(--ink)";
  help.style.fontWeight = "900";
  setTimeout(() => {
    help.style.color = "";
    help.style.fontWeight = "";
    help.textContent = "칸을 눌러 도전해 보자!";
  }, 4000);
}
