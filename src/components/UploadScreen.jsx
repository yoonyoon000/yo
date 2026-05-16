import { ImagePlus } from 'lucide-react';

export default function UploadScreen({ onImageUpload }) {
  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.match(/^image\/(png|jpeg)$/)) return;
    onImageUpload(file);
  };

  return (
    <section className="upload-screen">
      <div className="brand-mark">Sseudam</div>
      <h1>쓰담 포토부스</h1>
      <p>사진 위에 손 스티커를 얹어 나만의 최애 포토카드를 만들어보세요.</p>
      <label className="upload-button">
        <ImagePlus size={20} />
        이미지 업로드
        <input type="file" accept="image/png,image/jpeg" onChange={handleUpload} />
      </label>
    </section>
  );
}
