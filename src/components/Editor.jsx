import Konva from 'konva';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Group, Image as KonvaImage, Layer, Path, Rect, Stage, Star, Text, Transformer } from 'react-konva';
import StickerPanel from './StickerPanel.jsx';
import Toolbar from './Toolbar.jsx';

const MAX_CANVAS_WIDTH = 820;
const TOOLBAR_HEIGHT = 150;
const STICKER_TRAY_HEIGHT = 250;

function useViewportSize() {
  const [size, setSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, []);

  return size;
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

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function clampImageTransform(transform, canvasSize) {
  const scale = clampNumber(transform.scale, 1, 4);
  const minX = canvasSize.width - canvasSize.width * scale;
  const minY = canvasSize.height - canvasSize.height * scale;

  return {
    scale,
    x: clampNumber(transform.x, minX, 0),
    y: clampNumber(transform.y, minY, 0),
  };
}

function getTouchInfo(stage, touches) {
  const rect = stage.container().getBoundingClientRect();
  const first = touches[0];
  const second = touches[1];
  const firstPoint = {
    x: first.clientX - rect.left,
    y: first.clientY - rect.top,
  };
  const secondPoint = {
    x: second.clientX - rect.left,
    y: second.clientY - rect.top,
  };

  return {
    center: {
      x: (firstPoint.x + secondPoint.x) / 2,
      y: (firstPoint.y + secondPoint.y) / 2,
    },
    distance: Math.hypot(firstPoint.x - secondPoint.x, firstPoint.y - secondPoint.y),
  };
}

function EditableImage({ image, width, height, brightness, blur, transform }) {
  const imageRef = useRef(null);
  const hasFilters = brightness !== 100 || blur > 0;

  useEffect(() => {
    if (!imageRef.current) return;
    if (hasFilters) {
      imageRef.current.cache({ pixelRatio: 2 });
    } else {
      imageRef.current.clearCache();
    }
    imageRef.current.getLayer()?.batchDraw();
  }, [hasFilters, image, brightness, blur, width, height]);

  return (
    <KonvaImage
      ref={imageRef}
      name="background"
      image={image}
      x={transform.x}
      y={transform.y}
      width={width}
      height={height}
      scaleX={transform.scale}
      scaleY={transform.scale}
      filters={hasFilters ? [Konva.Filters.Brighten, Konva.Filters.Blur] : []}
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
      node.scaleX(item.flipped ? -nextScaleX : nextScaleX);
      node.scaleY(nextScaleY);

      onChange({
        ...item,
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
        scaleX: Math.max(nextScaleX, 0.2),
        scaleY: Math.max(nextScaleY, 0.2),
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
      const nextScaleX = Math.abs(node.scaleX());
      const nextScaleY = Math.abs(node.scaleY());
      node.scaleX(nextScaleX);
      node.scaleY(nextScaleY);

      onChange({
        ...item,
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
        scaleX: Math.max(nextScaleX, 0.25),
        scaleY: Math.max(nextScaleY, 0.25),
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

  return (
    <Group {...commonProps}>
      <Path
        data="M 0 30 C -28 8 -45 -10 -35 -29 C -27 -44 -8 -40 0 -24 C 8 -40 27 -44 35 -29 C 45 -10 28 8 0 30 Z"
        fill="#ff7fa8"
        stroke="#d85f82"
        strokeWidth={2}
        shadowColor="#ff9ab8"
        shadowBlur={10}
        shadowOpacity={0.5}
      />
    </Group>
  );
}

export default function Editor({ imageFile, onChangeImage }) {
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const viewportSize = useViewportSize();
  const imageUrl = useMemo(() => URL.createObjectURL(imageFile), [imageFile]);
  const uploadedImage = useLoadedImage(imageUrl);
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [brightness, setBrightness] = useState(100);
  const [blur, setBlur] = useState(0);
  const [imageTransform, setImageTransform] = useState({ x: 0, y: 0, scale: 1 });
  const pinchRef = useRef(null);

  useEffect(() => () => URL.revokeObjectURL(imageUrl), [imageUrl]);

  const canvasSize = useMemo(() => {
    if (!uploadedImage) return { width: 640, height: 480 };
    // 휴대폰 한 화면에 사진 전체가 들어오도록 가로/세로 여유를 함께 계산한다.
    const availableWidth = Math.min(viewportSize.width - 28, MAX_CANVAS_WIDTH);
    const availableHeight = Math.max(220, viewportSize.height - TOOLBAR_HEIGHT - STICKER_TRAY_HEIGHT);
    const ratio = Math.min(availableWidth / uploadedImage.width, availableHeight / uploadedImage.height, 1);
    return {
      width: Math.round(uploadedImage.width * ratio),
      height: Math.round(uploadedImage.height * ratio),
    };
  }, [uploadedImage, viewportSize.height, viewportSize.width]);

  useEffect(() => {
    setImageTransform({ x: 0, y: 0, scale: 1 });
    pinchRef.current = null;
  }, [imageFile, canvasSize.height, canvasSize.width]);

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
    snapshot();
    const nextItem = {
      id: crypto.randomUUID(),
      type: 'effect',
      effectType,
      x: canvasSize.width * 0.58,
      y: canvasSize.height * 0.34,
      rotation: 8,
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
    setImageTransform({ x: 0, y: 0, scale: 1 });
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

  const downloadImage = async () => {
    setSelectedId(null);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const stage = stageRef.current;
    if (!stage || !uploadedImage) return;

    const exportScale = Math.max(uploadedImage.width / canvasSize.width, 1);
    const rawUrl = stage.toDataURL({
      pixelRatio: exportScale,
      mimeType: 'image/jpeg',
      quality: 1,
    });
    downloadDataUrl(rawUrl, 'sseudam-photobooth.jpg');
  };

  const handleTouchStart = (event) => {
    const touches = event.evt.touches;
    if (touches.length < 2) return;

    event.evt.preventDefault();
    setSelectedId(null);
    const stage = stageRef.current;
    if (!stage) return;
    pinchRef.current = getTouchInfo(stage, touches);
  };

  const handleTouchMove = (event) => {
    const touches = event.evt.touches;
    if (touches.length < 2) {
      pinchRef.current = null;
      return;
    }

    event.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const touchInfo = getTouchInfo(stage, touches);
    const previousTouchInfo = pinchRef.current ?? touchInfo;

    setImageTransform((currentTransform) => {
      const scaleBy = touchInfo.distance / previousTouchInfo.distance;
      const nextScale = clampNumber(currentTransform.scale * scaleBy, 1, 4);
      const focusPoint = {
        x: (previousTouchInfo.center.x - currentTransform.x) / currentTransform.scale,
        y: (previousTouchInfo.center.y - currentTransform.y) / currentTransform.scale,
      };
      const nextTransform = {
        scale: nextScale,
        x: touchInfo.center.x - focusPoint.x * nextScale,
        y: touchInfo.center.y - focusPoint.y * nextScale,
      };

      return clampImageTransform(nextTransform, canvasSize);
    });

    pinchRef.current = touchInfo;
  };

  const handleTouchEnd = (event) => {
    if (event.evt.touches.length < 2) {
      pinchRef.current = null;
    }
  };

  return (
    <section className="editor-screen">
      <Toolbar
        canEditSelected={Boolean(selectedItem)}
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
                handleTouchStart(event);
                if (event.target === event.target.getStage() || event.target.name() === 'background') setSelectedId(null);
              }}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <Layer>
                <Rect name="background" width={canvasSize.width} height={canvasSize.height} fill="#ffffff" />
                {uploadedImage && (
                  <EditableImage
                    image={uploadedImage}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    brightness={brightness}
                    blur={blur}
                    transform={imageTransform}
                  />
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
