import { ImagePlus } from 'lucide-react';

export default function UploadScreen({ onImageUpload }) {
  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.match(/^image\/(png|jpeg)$/)) return;
    onImageUpload(file);
  };

  return (
    <section className="upload-screen">
      <h1>너에게 닿기를</h1>
      <p>모니터 속 너에게 닿기를</p>
      <label className="upload-button">
        <ImagePlus size={20} />
        이미지 업로드
        <input type="file" accept="image/png,image/jpeg" onChange={handleUpload} />
      </label>
    </section>
  );
}
