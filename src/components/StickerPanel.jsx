import { stickers } from '../data/stickers.js';

export default function StickerPanel({ onAddSticker, onAddEffect }) {
  return (
    <aside className="sticker-panel">
      <div className="panel-section">
        <h2>손 스티커</h2>
        <div className="sticker-grid">
          {stickers.map((sticker) => (
            <button
              className="sticker-tile"
              type="button"
              key={sticker.id}
              onClick={() => onAddSticker(sticker)}
              title={`${sticker.label} 추가`}
            >
              {sticker.src ? (
                <img src={sticker.src} alt="" />
              ) : (
                <span className="sticker-placeholder">{sticker.emoji}</span>
              )}
              <span>{sticker.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <h2>장식 효과</h2>
        <div className="effect-buttons">
          <button type="button" onClick={() => onAddEffect('heart')}>하트 추가</button>
          <button type="button" onClick={() => onAddEffect('sparkle')}>반짝이 추가</button>
          <button type="button" onClick={() => onAddEffect('bubble')}>말풍선 추가</button>
        </div>
      </div>
    </aside>
  );
}
