const stickerModules = import.meta.glob('../assets/stickers/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const stickerDefinitions = [
  { id: 'cheek-pinch', label: '볼 꼬집기', fileName: 'cheek-pinch.png', sourceName: '꼬집기.png', width: 301, height: 435, emoji: '🤏' },
  { id: 'v-sign', label: '브이', fileName: 'v-sign.png', sourceName: '브이.png', width: 239, height: 470, emoji: '✌' },
  { id: 'head-pat', label: '머리 쓰담', fileName: 'head-pat.png', sourceName: '쓰담.png', width: 382, height: 428, emoji: '🫳' },
  { id: 'hand-heart', label: '손하트', fileName: 'hand-heart.png', sourceName: '볼하트.png', width: 319, height: 448, emoji: '♡' },
  { id: 'chin-pose', label: '턱 받치기', fileName: 'chin-pose.png', sourceName: '받침.png', width: 281, height: 456, emoji: '🫴' },
  { id: 'waving-hand', label: '손 흔들기', fileName: 'waving-hand.png', sourceName: '하이.png', width: 281, height: 456, emoji: '👋' },
  { id: 'cheek-poke', label: '볼 찌르기', fileName: 'cheek-poke.png', sourceName: '볼콕.png', width: 367, height: 389, emoji: '☝' },
  { id: 'face-frame', label: '얼굴 감싸기', fileName: 'face-frame.png', sourceName: '꽃받침.png', width: 398, height: 433, emoji: '🫶' },
];

export const stickers = stickerDefinitions.map((sticker) => {
  const match = Object.entries(stickerModules).find(([path]) => path.endsWith(sticker.fileName));

  return {
    ...sticker,
    src: match?.[1] ?? null,
  };
});
