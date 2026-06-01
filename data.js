// 무무가리킴 — 문항 데이터
// 거리 3분법: near = 말하는 사람(무무) 가까이(근칭) / mid = 듣는 사람(친구) 가까이(중칭) / far = 둘 다 멀리(원칭)

// 위치 → 사람이 읽기 쉬운 설명
const POS_DESC = {
  near: "말하는 무무 가까이",
  mid: "듣는 친구 가까이",
  far: "무무·친구 둘 다에게서 멀리",
};

// 모드 정보(탑 블록 라벨/아이콘)
const MODES = [
  { key: "scene", name: "장면 보고 고르기", icon: "👀" },
  { key: "perspective", name: "관점 바꾸기", icon: "🔄" },
  { key: "dialogue", name: "대화 빈칸 채우기", icon: "💬" },
  { key: "build", name: "문장 만들기", icon: "🏗️" },
];

const FLOORS = [
  {
    id: 1,
    name: "1층 · 사물",
    scope: "사물을 가리키는 말",
    badge: { icon: "🔎", name: "거리 탐정" },
    sheet: "obj", // assets/items-objects.png 칸 매핑
    words: { near: "이것", mid: "그것", far: "저것" },
    noun: false, // 가리키는 말이 홀로 쓰임
    intro:
      "물건이 어디 있는지 보고 골라! 내 손 가까이면 ‘이것’, 친구 가까이면 ‘그것’, 둘 다 멀면 ‘저것’.",
    modes: {
      // 장면: 사물이 한 위치에 있고, 말풍선 빈칸에 알맞은 말 고르기
      scene: [
        { item: { name: "사탕", emoji: "🍬", cell: 0 }, pos: "near", frame: "○○ 줄까?" },
        { item: { name: "우산", emoji: "☂️", cell: 1 }, pos: "mid", frame: "○○ 좀 건네줄래?" },
        { item: { name: "연", emoji: "🪁", cell: 2 }, pos: "far", frame: "○○ 좀 봐, 하늘 높이 떴어!" },
        { item: { name: "공", emoji: "⚽", cell: 7 }, pos: "far", frame: "○○ 저기로 굴러갔어!" },
      ],
      // 관점: 사물은 한쪽에 고정. 무무가 말할 때 / 친구가 말할 때 각각 고르기
      perspective: [
        { item: { name: "풍선", emoji: "🎈", cell: 3 }, side: "near" },
        { item: { name: "모자", emoji: "🧢", cell: 4 }, side: "mid" },
        { item: { name: "인형", emoji: "🧸", cell: 8 }, side: "near" },
      ],
      // 대화(화맥지시): 앞에서 말한 것을 다시 가리키기 — 위치가 아닌 문맥
      dialogue: [
        {
          lines: [
            { who: "친구", text: "어제 빌려준 책 다 읽었어?" },
            { who: "무무", text: "응, ○○ 정말 재밌더라!", blank: true },
          ],
          answer: "그것",
          feedback: "앞에서 말한 ‘책’을 다시 가리키니까 ‘그것’! (거리가 아니라 ‘이미 말했다’가 핵심)",
        },
        {
          lines: [
            { who: "친구", text: "손에 든 게 뭐야?" },
            { who: "무무", cue: "(사탕을 내밀며)", text: "○○? 엄청 맛있는 사탕이야!", blank: true },
          ],
          answer: "이것",
          feedback: "지금 무무 손에 있으니 ‘이것’! 대화라고 무조건 ‘그것’은 아니야.",
        },
        {
          lines: [
            { who: "무무", cue: "(창밖 멀리 가리키며)", text: "○○ 좀 봐, 무지개야!", blank: true },
            { who: "친구", text: "우와, 정말 예쁘다!" },
          ],
          answer: "저것",
          feedback: "무무·친구 둘 다에게서 멀리 있으니 ‘저것’!",
        },
      ],
      // 문장 만들기: 장면에 맞는 말을 골라 한 문장 완성 → 작품
      build: [
        { item: { name: "사과", emoji: "🍎", cell: 5 }, pos: "far", frame: "○○ 먹고 싶다!" },
        { item: { name: "지우개", emoji: "🩹", cell: 6 }, pos: "near", frame: "○○ 빌려줄게." },
        { item: { name: "색연필", emoji: "🖍️", cell: 9 }, pos: "mid", frame: "○○ 좀 줄래?" },
      ],
    },
  },

  {
    id: 2,
    name: "2층 · 장소",
    scope: "장소를 가리키는 말",
    badge: { icon: "🧭", name: "장소 길잡이" },
    sheet: "place", // assets/items-places.png 칸 매핑
    words: { near: "여기", mid: "거기", far: "저기" },
    noun: false,
    intro:
      "장소도 똑같아! 내가 있는 곳은 ‘여기’, 친구가 있는 곳은 ‘거기’, 둘 다 먼 곳은 ‘저기’.",
    modes: {
      scene: [
        { item: { name: "내 자리", emoji: "🟢", cell: 0 }, pos: "near", frame: "○○로 와!" },
        { item: { name: "친구 자리", emoji: "🔵", cell: 1 }, pos: "mid", frame: "○○ 자리 좋아?" },
        { item: { name: "산", emoji: "⛰️", cell: 2 }, pos: "far", frame: "○○ 봐, 산이야!" },
        { item: { name: "바다", emoji: "🌊", cell: 9 }, pos: "far", frame: "○○ 좀 봐, 바다야!" },
      ],
      perspective: [
        { item: { name: "그늘", emoji: "🌳", cell: 3 }, side: "mid" },
        { item: { name: "모래밭", emoji: "🏖️", cell: 4 }, side: "near" },
        { item: { name: "미끄럼틀", emoji: "🛝", cell: 8 }, side: "mid" },
      ],
      dialogue: [
        {
          lines: [
            { who: "친구", text: "어제 간 수영장 어땠어?" },
            { who: "무무", text: "응! ○○ 정말 시원했어.", blank: true },
          ],
          answer: "거기",
          feedback: "앞에서 말한 ‘수영장’을 다시 가리키니까 ‘거기’! (거리가 아니라 맥락)",
        },
        {
          lines: [
            { who: "무무", cue: "(자기 자리를 가리키며)", text: "○○로 와! 내 옆자리 비었어.", blank: true },
            { who: "친구", text: "응, 지금 갈게!" },
          ],
          answer: "여기",
          feedback: "무무가 있는 곳이니 ‘여기’! 대화라고 무조건 ‘거기’는 아니야.",
        },
        {
          lines: [
            { who: "무무", cue: "(저 멀리 산을 가리키며)", text: "○○까지 가보고 싶다!", blank: true },
            { who: "친구", text: "좋아, 언젠가 같이 가자!" },
          ],
          answer: "저기",
          feedback: "둘 다에게서 먼 곳이니 ‘저기’!",
        },
      ],
      build: [
        { item: { name: "꼭대기", emoji: "🏔️", cell: 5 }, pos: "far", frame: "○○까지 올라가 보자!" },
        { item: { name: "내 옆", emoji: "🪑", cell: 6 }, pos: "near", frame: "○○에 앉을래." },
        { item: { name: "운동장", emoji: "🏟️", cell: 7 }, pos: "mid", frame: "○○에서 만나자!" },
      ],
    },
  },

  {
    id: 3,
    name: "3층 · 꾸미는 말",
    scope: "이름씨를 꾸며 주는 가리키는 말",
    badge: { icon: "🎨", name: "꾸밈 장인" },
    sheet: "noun", // assets/items-nouns.png 칸 매핑
    words: { near: "이", mid: "그", far: "저" },
    noun: true, // '이/그/저' + 명사 형태
    intro:
      "이번엔 이름씨를 꾸며 줘! 내 가까이면 ‘이 책’, 친구 가까이면 ‘그 책’, 멀면 ‘저 책’처럼.",
    modes: {
      scene: [
        { item: { name: "책", emoji: "📗", cell: 0 }, pos: "near", frame: "○○ 책 재밌어 보여." },
        { item: { name: "가방", emoji: "🎒", cell: 1 }, pos: "mid", frame: "○○ 가방 예쁘다." },
        { item: { name: "나무", emoji: "🌳", cell: 2 }, pos: "far", frame: "○○ 나무 정말 크다!" },
        { item: { name: "시계", emoji: "🕐", cell: 8 }, pos: "far", frame: "○○ 시계 멈췄나 봐." },
      ],
      perspective: [
        { item: { name: "강아지", emoji: "🐶", cell: 3 }, side: "near" },
        { item: { name: "자전거", emoji: "🚲", cell: 4 }, side: "mid" },
        { item: { name: "모자", emoji: "👒", cell: 7 }, side: "near" },
      ],
      dialogue: [
        {
          lines: [
            { who: "친구", text: "내가 말한 영화 봤어?" },
            { who: "무무", text: "응, ○○ 영화 진짜 재밌어!", blank: true },
          ],
          answer: "그",
          feedback: "앞에서 말한 ‘영화’를 꾸며 주니까 ‘그 영화’! (맥락으로 가리킴)",
        },
        {
          lines: [
            { who: "친구", text: "무슨 책 읽어?" },
            { who: "무무", cue: "(들고 있는 책을 보이며)", text: "○○ 책! 공룡 이야기야.", blank: true },
          ],
          answer: "이",
          feedback: "지금 무무가 든 책이니 ‘이 책’! 대화라고 무조건 ‘그’는 아니야.",
        },
        {
          lines: [
            { who: "무무", cue: "(멀리 있는 나무를 가리키며)", text: "○○ 나무 정말 크다!", blank: true },
            { who: "친구", text: "응, 엄청 오래된 나무래." },
          ],
          answer: "저",
          feedback: "둘 다에게서 먼 나무니 ‘저 나무’!",
        },
      ],
      build: [
        { item: { name: "산", emoji: "🏔️", cell: 5 }, pos: "far", frame: "○○ 산은 정말 높다." },
        { item: { name: "그림", emoji: "🖼️", cell: 6 }, pos: "near", frame: "○○ 그림은 내가 그렸어." },
        { item: { name: "의자", emoji: "🪑", cell: 9 }, pos: "mid", frame: "○○ 의자에 앉아." },
      ],
    },
  },
];

// 무무 응원 대사
const MUMU_LINES = {
  start: "같이 ‘가리키는 말의 탑’을 쌓아볼까?",
  correct: ["딩동댕! 정확해!", "와, 바로 그거야!", "거리 관계를 잘 봤어!", "척척박사다!"],
  wrong: ["음… 거리를 다시 볼까?", "괜찮아, 다시 해보자!", "누구 가까이 있는지 보면 보여!"],
  combo: ["연속 정답! 🔥", "멈추지 않아! ⚡", "불타오른다! 🔥"],
  floorClear: "한 층 완성! 무무가 위로 한 칸 올라갔어 🎉",
  allClear: "꼭대기 도착! 가리키는 말 마스터피스 완성! 🏆",
};

// 한 문항의 정답 단어를 위치/층 어휘에서 구한다
function wordFor(floor, pos) {
  return floor.words[pos];
}

// 보기(세 단어) 생성 — 층 어휘 순서대로
function choicesFor(floor) {
  return [floor.words.near, floor.words.mid, floor.words.far];
}

// 단어 → 위치(near/mid/far) 역매핑 (오개념 교정용)
function posOfWord(floor, word) {
  return Object.keys(floor.words).find((p) => floor.words[p] === word) || null;
}
