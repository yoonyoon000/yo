import Konva from 'konva';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Circle, Group, Image as KonvaImage, Layer, Rect, Stage, Star, Text, Transformer } from 'react-konva';
import StickerPanel from './StickerPanel.jsx';
import Toolbar from './Toolbar.jsx';

const MAX_CANVAS_WIDTH = 820;
const MAX_CANVAS_HEIGHT = 760;

function useViewportWidth() {
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return width;
}

function useLoadedImage(src) {
  const [image, setImage] = useState(null);

  useEffect(() => {
    if (!src) {
      setImage(null);
      return undefined;
    }

    const nextImage = new Image();
    nextImage.onload = () => setImage(nextImage);
    nextImage.onerror = () => setImage(null);
    nextImage.src = src;

    return () => {
      nextImage.onload = null;
      nextImage.onerror = null;
    };
  }, [src]);

  return image;
}

function removeWhiteBackground(image) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  context.drawImage(image, 0, 0);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  // 실제 스티커 PNG에 흰 배경이 있어도 사진 위에서는 투명 스티커처럼 보이게 만든다.
  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);

    if (red > 248 && green > 248 && blue > 248 && max - min < 5) {
      pixels[index + 3] = 0;
    }
  }

  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

function useStickerImage(src) {
  const [processedSrc, setProcessedSrc] = useState(null);

  useEffect(() => {
    if (!src) {
      setProcessedSrc(null);
      return undefined;
    }

    let isActive = true;
    const sourceImage = new Image();
    sourceImage.onload = () => {
      if (!isActive) return;
      setProcessedSrc(removeWhiteBackground(sourceImage));
    };
    sourceImage.onerror = () => {
      if (isActive) setProcessedSrc(src);
    };
    sourceImage.src = src;

    return () => {
      isActive = false;
      sourceImage.onload = null;
      sourceImage.onerror = null;
    };
  }, [src]);

  return useLoadedImage(processedSrc);
}

function EditableImage({ image, width, height, brightness, blur }) {
  const imageRef = useRef(null);

  useEffect(() => {
    if (!imageRef.current) return;
    imageRef.current.cache();
    imageRef.current.getLayer()?.batchDraw();
  }, [image, brightness, blur, width, height]);

  return (
    <KonvaImage
      ref={imageRef}
      name="background"
      image={image}
      width={width}
      height={height}
      filters={[Konva.Filters.Brighten, Konva.Filters.Blur]}
      brightness={(brightness - 100) / 100}
      blurRadius={blur}
    />
  );
}

function StickerNode({ item, isSelected, onSelect, onChange }) {
  const image = useStickerImage(item.src);
  const shapeRef = useRef(null);

  const commonProps = {
    id: item.id,
    ref: shapeRef,
    x: item.x,
    y: item.y,
    draggable: true,
    rotation: item.rotation,
    scaleX: item.scaleX * (item.flipped ? -1 : 1),
    scaleY: item.scaleY,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: (event) => {
      onChange({ ...item, x: event.target.x(), y: event.target.y() });
    },
    onTransformEnd: (event) => {
      const node = event.target;
      const nextScaleX = Math.abs(node.scaleX());
      const nextScaleY = Math.abs(node.scaleY());

      onChange({
        ...item,
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
        scaleX: Math.max(nextScaleX, 0.2),
        scaleY: Math.max(nextScaleY, 0.2),
        flipped: node.scaleX() < 0,
      });
    },
  };

  if (image) {
    return (
      <KonvaImage
        {...commonProps}
        image={image}
        width={item.width}
        height={item.height}
        offsetX={item.width / 2}
        offsetY={item.height / 2}
      />
    );
  }

  return (
    <Group {...commonProps} width={item.width} height={item.height} offsetX={item.width / 2} offsetY={item.height / 2}>
      <Rect
        width={item.width}
        height={item.height}
        cornerRadius={24}
        fill="#fff5f8"
        stroke="#f5a3bb"
        dash={[8, 6]}
        shadowColor="#f6a9bd"
        shadowBlur={12}
        shadowOpacity={0.25}
      />
      <Text text={item.emoji} width={item.width} y={22} align="center" fontSize={36} />
      <Text text={item.label} width={item.width} y={72} align="center" fontSize={16} fill="#a14d67" fontStyle="bold" />
    </Group>
  );
}

function EffectNode({ item, onSelect, onChange }) {
  const commonProps = {
    id: item.id,
    x: item.x,
    y: item.y,
    draggable: true,
    rotation: item.rotation,
    scaleX: item.scaleX,
    scaleY: item.scaleY,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: (event) => onChange({ ...item, x: event.target.x(), y: event.target.y() }),
    onTransformEnd: (event) => {
      const node = event.target;
      onChange({
        ...item,
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
        scaleX: Math.max(node.scaleX(), 0.25),
        scaleY: Math.max(node.scaleY(), 0.25),
      });
    },
  };

  if (item.effectType === 'sparkle') {
    return (
      <Group {...commonProps}>
        <Star
          numPoints={4}
          innerRadius={13}
          outerRadius={30}
          fill="#ffe27a"
          stroke="#d89b22"
          strokeWidth={2}
          shadowBlur={8}
          shadowColor="#f4c85a"
        />
      </Group>
    );
  }

  if (item.effectType === 'bubble') {
    return (
      <Group {...commonProps}>
        <Rect width={210} height={82} offsetX={105} offsetY={41} cornerRadius={22} fill="#ffffff" stroke="#f0a6ba" strokeWidth={3} />
        <Text text={item.text} width={180} offsetX={90} offsetY={18} x={0} y={0} align="center" fontSize={20} fill="#4f343d" fontStyle="bold" />
      </Group>
    );
  }

  return (
    <Group {...commonProps}>
      <Circle radius={22} fill="#ff8fb3" shadowColor="#fa8bad" shadowBlur={10} />
      <Circle x={-15} y={-8} radius={18} fill="#ff8fb3" />
      <Circle x={15} y={-8} radius={18} fill="#ff8fb3" />
    </Group>
  );
}

export default function Editor({ imageFile, onChangeImage }) {
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const viewportWidth = useViewportWidth();
  const imageUrl = useMemo(() => URL.createObjectURL(imageFile), [imageFile]);
  const uploadedImage = useLoadedImage(imageUrl);
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [brightness, setBrightness] = useState(100);
  const [blur, setBlur] = useState(0);
  const [includeStoryRatio, setIncludeStoryRatio] = useState(false);
  const [includeWatermark, setIncludeWatermark] = useState(true);

  useEffect(() => () => URL.revokeObjectURL(imageUrl), [imageUrl]);

  const canvasSize = useMemo(() => {
    if (!uploadedImage) return { width: 640, height: 480 };
    // 모바일 작업 폭을 기준으로 사진 비율을 유지하며 자동 축소한다.
    const availableWidth = Math.min(viewportWidth - 52, viewportWidth >= 760 ? 572 : 480);
    const maxWidth = Math.min(MAX_CANVAS_WIDTH, Math.max(300, availableWidth));
    const ratio = Math.min(maxWidth / uploadedImage.width, MAX_CANVAS_HEIGHT / uploadedImage.height, 1);
    return {
      width: Math.round(uploadedImage.width * ratio),
      height: Math.round(uploadedImage.height * ratio),
    };
  }, [uploadedImage, viewportWidth]);

  const selectedItem = items.find((item) => item.id === selectedId);

  useEffect(() => {
    const selectedNode = stageRef.current?.findOne((node) => node.id() === selectedId);
    if (!selectedNode || !transformerRef.current) {
      transformerRef.current?.nodes([]);
      return;
    }

    transformerRef.current.nodes([selectedNode]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [items, selectedId]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        event.preventDefault();
        deleteSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const snapshot = useCallback(() => {
    setHistory((prev) => [...prev.slice(-15), items]);
  }, [items]);

  const updateItem = (nextItem) => {
    setItems((prev) => prev.map((item) => (item.id === nextItem.id ? nextItem : item)));
  };

  const addSticker = (sticker) => {
    snapshot();
    const stickerLongSide = Math.min(canvasSize.width, canvasSize.height) * 0.34;
    const stickerRatio = sticker.width / sticker.height;
    const isVertical = sticker.height >= sticker.width;
    const stickerWidth = isVertical ? stickerLongSide * stickerRatio : stickerLongSide;
    const stickerHeight = isVertical ? stickerLongSide : stickerLongSide / stickerRatio;
    const nextItem = {
      id: crypto.randomUUID(),
      type: 'sticker',
      label: sticker.label,
      emoji: sticker.emoji,
      src: sticker.src,
      x: canvasSize.width / 2,
      y: canvasSize.height / 2,
      width: Math.max(stickerWidth, 88),
      height: Math.max(stickerHeight, 88),
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      flipped: false,
    };
    setItems((prev) => [...prev, nextItem]);
    setSelectedId(nextItem.id);
  };

  const addEffect = (effectType) => {
    const text = effectType === 'bubble' ? window.prompt('말풍선에 넣을 문구를 입력하세요.', '오늘도 예쁨') : '';
    if (effectType === 'bubble' && text === null) return;

    snapshot();
    const nextItem = {
      id: crypto.randomUUID(),
      type: 'effect',
      effectType,
      text: text || '',
      x: canvasSize.width * 0.58,
      y: canvasSize.height * 0.34,
      rotation: effectType === 'bubble' ? -4 : 8,
      scaleX: 1,
      scaleY: 1,
    };
    setItems((prev) => [...prev, nextItem]);
    setSelectedId(nextItem.id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    snapshot();
    setItems((prev) => prev.filter((item) => item.id !== selectedId));
    setSelectedId(null);
  };

  const clearCanvas = () => {
    snapshot();
    setItems([]);
    setSelectedId(null);
    setBrightness(100);
    setBlur(0);
  };

  const undo = () => {
    setHistory((prev) => {
      const last = prev.at(-1);
      if (!last) return prev;
      setItems(last);
      setSelectedId(null);
      return prev.slice(0, -1);
    });
  };

  const flipSelected = () => {
    if (!selectedItem) return;
    snapshot();
    updateItem({ ...selectedItem, flipped: !selectedItem.flipped });
  };

  const moveSelectedLayer = (direction) => {
    if (!selectedItem) return;
    snapshot();
    setItems((prev) => {
      const index = prev.findIndex((item) => item.id === selectedId);
      const nextIndex = direction === 'forward' ? Math.min(index + 1, prev.length - 1) : Math.max(index - 1, 0);
      const copy = [...prev];
      const [target] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, target);
      return copy;
    });
  };

  const downloadDataUrl = (dataUrl, fileName) => {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  };

  const drawWatermark = (context, width, height) => {
    if (!includeWatermark) return;
    const date = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date());
    context.fillStyle = 'rgba(255,255,255,0.82)';
    context.fillRect(24, height - 58, 250, 34);
    context.fillStyle = '#9b5268';
    context.font = '600 18px Arial';
    context.fillText(`쓰담 포토부스 · ${date}`, 38, height - 35);
  };

  const downloadImage = async () => {
    setSelectedId(null);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const stage = stageRef.current;
    if (!stage) return;
    const rawUrl = stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' });

    if (!includeStoryRatio && !includeWatermark) {
      downloadDataUrl(rawUrl, 'sseudam-photobooth.png');
      return;
    }

    const exportImage = new Image();
    exportImage.onload = () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const width = includeStoryRatio ? 1080 : exportImage.width;
      const height = includeStoryRatio ? 1920 : exportImage.height;
      canvas.width = width;
      canvas.height = height;
      context.fillStyle = '#f8f4ef';
      context.fillRect(0, 0, width, height);

      const ratio = Math.min((width - 96) / exportImage.width, (height - 180) / exportImage.height, 1);
      const drawWidth = exportImage.width * ratio;
      const drawHeight = exportImage.height * ratio;
      const x = (width - drawWidth) / 2;
      const y = (height - drawHeight) / 2;

      context.drawImage(exportImage, x, y, drawWidth, drawHeight);
      drawWatermark(context, width, height);
      downloadDataUrl(canvas.toDataURL('image/png'), 'sseudam-photobooth.png');
    };
    exportImage.src = rawUrl;
  };

  return (
    <section className="editor-screen">
      <Toolbar
        canEditSelected={Boolean(selectedItem)}
        includeStoryRatio={includeStoryRatio}
        includeWatermark={includeWatermark}
        imageBlur={blur}
        imageBrightness={brightness}
        onBackLayer={() => moveSelectedLayer('back')}
        onChangeBlur={setBlur}
        onChangeBrightness={setBrightness}
        onChangeImage={onChangeImage}
        onClear={clearCanvas}
        onDelete={deleteSelected}
        onDownload={downloadImage}
        onFlip={flipSelected}
        onForwardLayer={() => moveSelectedLayer('forward')}
        onToggleStoryRatio={() => setIncludeStoryRatio((prev) => !prev)}
        onToggleWatermark={() => setIncludeWatermark((prev) => !prev)}
        onUndo={undo}
      />

      <div className="editor-layout">
        <div className="canvas-wrap">
          <div className="canvas-card">
            <Stage
              ref={stageRef}
              width={canvasSize.width}
              height={canvasSize.height}
              onMouseDown={(event) => {
                if (event.target === event.target.getStage() || event.target.name() === 'background') setSelectedId(null);
              }}
              onTouchStart={(event) => {
                if (event.target === event.target.getStage() || event.target.name() === 'background') setSelectedId(null);
              }}
            >
              <Layer>
                <Rect name="background" width={canvasSize.width} height={canvasSize.height} fill="#ffffff" />
                {uploadedImage && (
                  <EditableImage image={uploadedImage} width={canvasSize.width} height={canvasSize.height} brightness={brightness} blur={blur} />
                )}
                {items.map((item) =>
                  item.type === 'sticker' ? (
                    <StickerNode
                      key={item.id}
                      item={{ ...item, id: item.id }}
                      isSelected={selectedId === item.id}
                      onSelect={() => setSelectedId(item.id)}
                      onChange={updateItem}
                    />
                  ) : (
                    <EffectNode key={item.id} item={item} onSelect={() => setSelectedId(item.id)} onChange={updateItem} />
                  ),
                )}
                <Transformer
                  ref={transformerRef}
                  rotateEnabled
                  anchorStroke="#f08aaa"
                  anchorFill="#ffffff"
                  borderStroke="#f08aaa"
                  anchorSize={12}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 32 || newBox.height < 32) return oldBox;
                    return newBox;
                  }}
                />
              </Layer>
            </Stage>
          </div>
        </div>
        <StickerPanel onAddSticker={addSticker} onAddEffect={addEffect} />
      </div>
    </section>
  );
}
