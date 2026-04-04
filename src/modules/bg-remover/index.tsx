import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAssetStore } from '../../store/assetStore';

const BgRemover: React.FC = () => {
  const { t } = useTranslation();
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { assets, loadAssets, addAsset } = useAssetStore();

  // 滚轮缩放处理函数
  const handleWheel = (
    e: React.WheelEvent<HTMLDivElement>,
    scale: number,
    setScale: (s: number) => void,
    translate: { x: number; y: number },
    setTranslate: (t: { x: number; y: number }) => void
  ) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(scale * delta, 5));
    const ratio = newScale / scale;
    setScale(newScale);
    setTranslate({
      x: mouseX - ratio * (mouseX - translate.x),
      y: mouseY - ratio * (mouseY - translate.y),
    });
  };

  // 鼠标按下处理函数
  const handleMouseDown = (
    e: React.MouseEvent,
    setDragging: (v: boolean) => void,
    setDragStart: (v: { x: number; y: number }) => void,
    translate: { x: number; y: number },
    setDragStartTranslate: (v: { x: number; y: number }) => void
  ) => {
    if (e.button !== 0) return;
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragStartTranslate({ ...translate });
  };

  // 鼠标移动处理函数
  const handleMouseMove = (
    e: React.MouseEvent,
    dragging: boolean,
    dragStart: { x: number; y: number },
    dragStartTranslate: { x: number; y: number },
    setTranslate: (t: { x: number; y: number }) => void
  ) => {
    if (!dragging) return;
    setTranslate({
      x: dragStartTranslate.x + e.clientX - dragStart.x,
      y: dragStartTranslate.y + e.clientY - dragStart.y,
    });
  };

  // 原图预览状态
  const [origScale, setOrigScale] = useState(1);
  const [origTranslate, setOrigTranslate] = useState({ x: 0, y: 0 });
  const [origDragging, setOrigDragging] = useState(false);
  const [origDragStart, setOrigDragStart] = useState({ x: 0, y: 0 });
  const [origDragStartTranslate, setOrigDragStartTranslate] = useState({ x: 0, y: 0 });

  // 结果图预览状态
  const [resultScale, setResultScale] = useState(1);
  const [resultTranslate, setResultTranslate] = useState({ x: 0, y: 0 });
  const [resultDragging, setResultDragging] = useState(false);
  const [resultDragStart, setResultDragStart] = useState({ x: 0, y: 0 });
  const [resultDragStartTranslate, setResultDragStartTranslate] = useState({ x: 0, y: 0 });

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  useEffect(() => {
    if (selectedAssetId) {
      loadOriginalImage();
    } else {
      setPreviewUrl(null);
      setOriginalUrl(null);
    }
  }, [selectedAssetId, assets]);

  const loadOriginalImage = async () => {
    if (!selectedAssetId) return;

    try {
      setError(null);

      const selectedAsset = assets.find(asset => asset.id === selectedAssetId);
      if (!selectedAsset) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (!canvas || !ctx) return;

      const img = new Image();
      img.src = selectedAsset.thumbnail;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
      });

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      ctx.drawImage(img, 0, 0);

      const originalDataUrl = canvas.toDataURL('image/png');
      setOriginalUrl(originalDataUrl);
    } catch (err) {
      console.error('加载原图时发生错误:', err);
      setError('加载原图失败');
    }
  };

  const processBackground = (imageBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL('../../workers/bgRemover.worker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.postMessage({ imageBlob });

      worker.onmessage = async (e) => {
        if (e.data.type === 'progress') {
          setStatusText(e.data.message);
        } else if (e.data.type === 'success') {
          const result = e.data.result;
          let blob: Blob;
          
          if (result instanceof Blob) {
            blob = result;
          } else if (result instanceof ArrayBuffer) {
            blob = new Blob([result], { type: 'image/png' });
          } else if (typeof result === 'string') {
            if (result.startsWith('data:')) {
              const res = await fetch(result);
              blob = await res.blob();
            } else {
              blob = new Blob([result], { type: 'image/png' });
            }
          } else {
            reject(new Error('未知的 result 格式'));
            worker.terminate();
            return;
          }
          
          resolve(blob);
          worker.terminate();
        } else if (e.data.type === 'error') {
          reject(new Error(e.data.error));
          worker.terminate();
        }
      };

      worker.onerror = (err) => {
        reject(err);
        worker.terminate();
      };
    });
  };

  const handleAssetSelect = (assetId: string) => {
    setSelectedAssetId(assetId);
    setError(null);
  };

  const startProcessing = async () => {
    if (!selectedAssetId) return;

    try {
      setIsProcessing(true);
      setError(null);
      setStatusText('准备处理...');

      const selectedAsset = assets.find(asset => asset.id === selectedAssetId);
      if (!selectedAsset) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (!canvas || !ctx) return;

      if (!WebAssembly) {
        setError('请使用 Chrome / Edge 最新版浏览器以支持 AI 抠图');
        setIsProcessing(false);
        setStatusText('');
        return;
      }

      const imageBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });

      if (!imageBlob) {
        throw new Error('无法创建图像Blob');
      }

      const resultBlob = await processBackground(imageBlob);

      const resultImg = new Image();
      resultImg.src = URL.createObjectURL(resultBlob);
      await new Promise<void>((resolve) => {
        resultImg.onload = () => resolve();
      });

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(resultImg, 0, 0);

      const dataUrl = canvas.toDataURL('image/png');
      setPreviewUrl(dataUrl);
      setError(null);
    } catch (err) {
      console.error('处理图像时发生错误:', err);
      setError('模型加载失败，请检查网络后重试');
    } finally {
      setIsProcessing(false);
      setStatusText('');
    }
  };

  const exportProcessedImage = async () => {
    if (!previewUrl) {
      setError('请先生成预览');
      return;
    }

    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      
      await addAsset({
        id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `Processed Image ${Date.now()}`,
        type: 'processed-image',
        source: 'bg-remover',
        createdAt: Date.now(),
        thumbnail: previewUrl,
        blob
      });
      
      const link = document.createElement('a');
      link.href = previewUrl;
      link.download = `processed-image-${Date.now()}.png`;
      link.click();
      
      alert('处理后的图像已成功导出并添加到资产池');
    } catch (err) {
      setError('导出失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  return (
    <div>
      <h2 className="module-header">{t('bgRemover.title')}</h2>
      <p className="module-subheader">{t('bgRemover.subtitle')}</p>
      
      {/* 上区：图片选择 + 开始按钮 */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>{t('bgRemover.uploadHint')}</h3>
          <div className="asset-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {assets.map((asset) => (
              <div 
                key={asset.id} 
                className={`asset-item ${selectedAssetId === asset.id ? 'selected' : ''}`}
                onClick={() => handleAssetSelect(asset.id)}
              >
                <img src={asset.thumbnail} alt={asset.name} />
                <div className="asset-item-name">{asset.name}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
          <button 
            className="button button-primary" 
            onClick={startProcessing}
            disabled={!selectedAssetId || isProcessing}
            style={{ width: '100%', height: '44px', fontSize: '15px', fontWeight: 600 }}
          >
            {isProcessing ? (
              <div className="loading" style={{ margin: 0 }}>
                {t('bgRemover.processing')}
              </div>
            ) : t('bgRemover.startRemove')}
          </button>
          {isProcessing && statusText && (
            <div style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>
              {statusText}
            </div>
          )}
        </div>
      </div>

      {/* 下区：左右对比预览 */}
      {selectedAssetId && (
        <div>
          {error && <div className="error" style={{ marginBottom: '24px' }}>{error}</div>}
          
          <div className="split-layout">
            {/* 左侧：原图预览 */}
            <div className="split-right" style={{ flex: 1 }}>
              <div className="card" style={{ height: '100%' }}>
                <div className="preview-header">
                  <div className="preview-title">
                    <span className="badge badge-secondary">{t('bgRemover.original')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge">{Math.round(origScale * 100)}%</span>
                    <button 
                      className="button" 
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => { setOrigScale(1); setOrigTranslate({ x: 0, y: 0 }); }}
                    >
                      适应屏幕
                    </button>
                  </div>
                </div>
                <div 
                  className="checkerboard"
                  style={{
                    height: '500px',
                    overflow: 'hidden',
                    position: 'relative',
                    cursor: origDragging ? 'grabbing' : 'grab'
                  }}
                  onWheel={(e) => handleWheel(e, origScale, setOrigScale, origTranslate, setOrigTranslate)}
                  onMouseDown={(e) => handleMouseDown(e, setOrigDragging, setOrigDragStart, origTranslate, setOrigDragStartTranslate)}
                  onMouseMove={(e) => handleMouseMove(e, origDragging, origDragStart, origDragStartTranslate, setOrigTranslate)}
                  onMouseUp={() => setOrigDragging(false)}
                  onMouseLeave={() => setOrigDragging(false)}
                  onDoubleClick={() => { setOrigScale(1); setOrigTranslate({ x: 0, y: 0 }); }}
                >
                  {originalUrl && (
                    <img 
                      src={originalUrl} 
                      alt="Original" 
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        transformOrigin: '0 0',
                        transform: `translate(${origTranslate.x}px, ${origTranslate.y}px) scale(${origScale})`,
                        pointerEvents: 'none',
                        background: 'transparent'
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
            
            {/* 右侧：处理后预览 */}
            <div className="split-right" style={{ flex: 1 }}>
              <div className="card" style={{ height: '100%' }}>
                <div className="preview-header">
                  <div className="preview-title">
                    <span className="badge badge-secondary">{t('bgRemover.result')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge">{Math.round(resultScale * 100)}%</span>
                    <button 
                      className="button" 
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => { setResultScale(1); setResultTranslate({ x: 0, y: 0 }); }}
                    >
                      适应屏幕
                    </button>
                  </div>
                </div>
                <div 
                  className="checkerboard"
                  style={{
                    height: '500px',
                    overflow: 'hidden',
                    position: 'relative',
                    cursor: resultDragging ? 'grabbing' : 'grab'
                  }}
                  onWheel={(e) => handleWheel(e, resultScale, setResultScale, resultTranslate, setResultTranslate)}
                  onMouseDown={(e) => handleMouseDown(e, setResultDragging, setResultDragStart, resultTranslate, setResultDragStartTranslate)}
                  onMouseMove={(e) => handleMouseMove(e, resultDragging, resultDragStart, resultDragStartTranslate, setResultTranslate)}
                  onMouseUp={() => setResultDragging(false)}
                  onMouseLeave={() => setResultDragging(false)}
                  onDoubleClick={() => { setResultScale(1); setResultTranslate({ x: 0, y: 0 }); }}
                >
                  {previewUrl ? (
                    <img 
                      src={previewUrl} 
                      alt="Result" 
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        transformOrigin: '0 0',
                        transform: `translate(${resultTranslate.x}px, ${resultTranslate.y}px) scale(${resultScale})`,
                        pointerEvents: 'none',
                        background: 'transparent'
                      }}
                    />
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      height: '100%', 
                      color: 'var(--text-muted)'
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🖼️</div>
                      <div>点击"开始去除"按钮处理</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* 导出按钮 */}
          {previewUrl && (
            <div className="card" style={{ marginTop: '24px' }}>
              <button 
                className="button button-primary" 
                onClick={exportProcessedImage}
                style={{ width: '100%', height: '44px' }}
              >
                {t('bgRemover.exportPng')}
              </button>
            </div>
          )}
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default BgRemover;
