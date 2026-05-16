import { useState } from 'react';
import UploadScreen from './components/UploadScreen.jsx';
import Editor from './components/Editor.jsx';

export default function App() {
  const [uploadedImage, setUploadedImage] = useState(null);

  return (
    <main className="app-shell">
      {uploadedImage ? (
        <Editor imageFile={uploadedImage} onChangeImage={() => setUploadedImage(null)} />
      ) : (
        <UploadScreen onImageUpload={setUploadedImage} />
      )}
    </main>
  );
}
