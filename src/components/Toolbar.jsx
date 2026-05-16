import {
  Download,
  FlipHorizontal,
  ImageUp,
  RotateCcw,
  Trash2,
  Undo2,
} from 'lucide-react';

export default function Toolbar({
  canEditSelected,
  imageBlur,
  imageBrightness,
  onChangeBlur,
  onChangeBrightness,
  onChangeImage,
  onClear,
  onDelete,
  onDownload,
  onFlip,
  onUndo,
}) {
  return (
    <header className="toolbar">
      <div className="toolbar-group">
        <button type="button" className="icon-button" onClick={onChangeImage} title="다른 이미지 업로드">
          <ImageUp size={18} />
        </button>
        <button type="button" className="icon-button" onClick={onUndo} title="되돌리기">
          <Undo2 size={18} />
        </button>
        <button type="button" className="icon-button" onClick={onClear} title="초기화">
          <RotateCcw size={18} />
        </button>
      </div>

      <div className="toolbar-group edit-actions">
        <button type="button" className="icon-button" onClick={onFlip} disabled={!canEditSelected} title="좌우반전">
          <FlipHorizontal size={18} />
        </button>
        <button type="button" className="icon-button danger" onClick={onDelete} disabled={!canEditSelected} title="삭제">
          <Trash2 size={18} />
        </button>
      </div>

      <div className="toolbar-sliders">
        <label>
          밝기
          <input
            type="range"
            min="70"
            max="130"
            value={imageBrightness}
            onChange={(event) => onChangeBrightness(Number(event.target.value))}
          />
        </label>
        <label>
          블러
          <input
            type="range"
            min="0"
            max="6"
            value={imageBlur}
            onChange={(event) => onChangeBlur(Number(event.target.value))}
          />
        </label>
      </div>

      <button type="button" className="save-button" onClick={onDownload}>
        <Download size={18} />
        이미지 저장하기
      </button>
    </header>
  );
}
