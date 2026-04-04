import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAssetStore } from '../../store/assetStore';

const SheetBuilder: React.FC = () => {
  const { t } = useTranslation();
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [columns, setColumns] = useState<number>(4);
  const [rows, setRows] = useState<number>(4);
  const [cellWidth, setCellWidth] = useState<number>(100);
  const [cellHeight, setCellHeight] = useState<number>(100);
  const [autoSize, setAutoSize] = useState<boolean>(true);
  const [padding, setPadding] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 预览区域缩放和平移状态
  const [previewScale, setPreviewScale] = useState<number>(1);
  const [previewTranslate, setPreviewTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartTranslate, setDragStartTranslate] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewImageRef = useRef<HTMLImageElement>(null);
  const { assets, loadAssets, addAsset } = useAssetStore();

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  useEffect(() => {
    generatePreview();
  }, [selectedAssets, columns, rows, cellWidth, cellHeight, autoSize, padding, scale, assets]);

  useEffect(() => {
    if (previewUrl) {
      // 重置缩放和平移，自动适应屏幕
      setPreviewScale(1);
      setPreviewTranslate({ x: 0, y: 0 });
      
      // 等待图片加载完成后计算适应屏幕的缩放比例
      setTimeout(() => {
        fitToView();
      }, 100);
    }
  }, [previewUrl]);

  const fitToView = () => {
    if (!previewContainerRef.current || !previewImageRef.current) {
      console.warn('fitToView：容器或图片引用为空');
      return;
    }
    
    // 直接设置为80%
    const finalScale = 0.8;
    console.log('fitToView 设置缩放为80%');
    
    setPreviewScale(finalScale);
    setPreviewTranslate({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (!previewContainerRef.current || !previewImageRef.current) return;
    
    const container = previewContainerRef.current;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // 计算鼠标在图片上的相对位置
    const image = previewImageRef.current;
    const imageWidth = image.naturalWidth * previewScale;
    const imageHeight = image.naturalHeight * previewScale;
    const relativeX = (mouseX - previewTranslate.x) / imageWidth;
    const relativeY = (mouseY - previewTranslate.y) / imageHeight;
    
    // 计算新的缩放比例
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    let newScale = previewScale * delta;
    newScale = Math.max(0.1, Math.min(newScale, 5)); // 限制缩放范围 10%～500%
    
    // 计算新的平移位置，使鼠标位置保持不变
    const newImageWidth = image.naturalWidth * newScale;
    const newImageHeight = image.naturalHeight * newScale;
    const newTranslateX = mouseX - relativeX * newImageWidth;
    const newTranslateY = mouseY - relativeY * newImageHeight;
    
    setPreviewScale(newScale);
    setPreviewTranslate({ x: newTranslateX, y: newTranslateY });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) { // 左键
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setDragStartTranslate({ ...previewTranslate });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    setPreviewTranslate({
      x: dragStartTranslate.x + deltaX,
      y: dragStartTranslate.y + deltaY
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssets(prev => {
      if (prev.includes(assetId)) {
        return prev.filter(id => id !== assetId);
      } else {
        return [...prev, assetId];
      }
    });
  };

  const generatePreview = async () => {
    const selectedAssetObjects = selectedAssets
      .map(id => assets.find(asset => asset.id === id))
      .filter((asset): asset is typeof assets[0] => asset !== undefined);
    if (selectedAssetObjects.length === 0) {
      setPreviewUrl(null);
      return;
    }

    try {
      console.log('开始生成 Sprite Sheet，帧数量:', selectedAssetObjects.length);
      console.log('参数：列数', columns, '行数', rows);
      
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      // 加载所有选中的图像
      const images = await Promise.all(
        selectedAssetObjects.map(async (asset) => {
          const img = new Image();
          img.src = asset.thumbnail;
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
          });
          return img;
        })
      );

      // 计算单元格尺寸
      let finalCellWidth = cellWidth;
      let finalCellHeight = cellHeight;

      if (autoSize) {
        // 自动计算最大尺寸
        let maxWidth = 0;
        let maxHeight = 0;
        images.forEach(img => {
          maxWidth = Math.max(maxWidth, img.width);
          maxHeight = Math.max(maxHeight, img.height);
        });
        finalCellWidth = maxWidth + padding * 2;
        finalCellHeight = maxHeight + padding * 2;
      }

      // 计算实际需要的行数
      const frameCount = selectedAssetObjects.length;
      const actualRows = Math.ceil(frameCount / columns);

      // 计算总画布尺寸
      const totalWidth = finalCellWidth * columns * scale;
      const totalHeight = finalCellHeight * actualRows * scale;

      // 检查画布尺寸是否超出浏览器限制
      if (totalWidth > 16384 || totalHeight > 16384) {
        setError('画布尺寸超出浏览器限制，请减小列数或缩放比例');
        return;
      }

      canvas.width = totalWidth;
      canvas.height = totalHeight;
      ctx.scale(scale, scale);

      // 绘制帧到网格
      selectedAssetObjects.forEach((_, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        
        if (row < actualRows) {
          const x = col * finalCellWidth + padding;
          const y = row * finalCellHeight + padding;
          const img = images[index];
          
          if (autoSize) {
            // 居中绘制
            const imgX = x + (finalCellWidth - padding * 2 - img.width) / 2;
            const imgY = y + (finalCellHeight - padding * 2 - img.height) / 2;
            ctx.drawImage(img, imgX, imgY);
          } else {
            // 强制缩放
            ctx.drawImage(img, x, y, finalCellWidth - padding * 2, finalCellHeight - padding * 2);
          }
        }
      });

      const dataUrl = canvas.toDataURL('image/png');
      console.log('生成结果 dataURL 长度:', dataUrl.length);
      setPreviewUrl(dataUrl);
      setError(null);
    } catch (err) {
      setError('生成预览失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  const exportSpriteSheet = async () => {
    if (!previewUrl) {
      setError('请先生成预览');
      return;
    }

    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      
      await addAsset({
        id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `Sprite Sheet ${Date.now()}`,
        type: 'sprite-sheet',
        source: 'sheet-builder',
        createdAt: Date.now(),
        thumbnail: previewUrl,
        blob
      });
      
      // 下载文件
      const link = document.createElement('a');
      link.href = previewUrl;
      link.download = `sprite-sheet-${Date.now()}.png`;
      link.click();
      
      alert('Sprite Sheet 已成功导出并添加到资产池');
    } catch (err) {
      setError('导出失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  return (
    <div>
      <h2 className="module-header">{t('sheetBuilder.title')}</h2>
      <p className="module-subheader">{t('sheetBuilder.subtitle')}</p>
      
      <div className="split-layout">
        {/* 左侧参数面板 */}
        <div className="split-left">
          <div className="card">
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>{t('sheetBuilder.selectFrames')}</h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
                gap: '8px', 
                maxHeight: '300px', 
                overflowY: 'auto', 
                padding: '12px',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)'
              }}>
                {assets.filter(asset => asset.type === 'frame').map((asset) => {
                  const orderIndex = selectedAssets.indexOf(asset.id);
                  const isSelected = orderIndex !== -1;
                  return (
                    <div 
                      key={asset.id} 
                      style={{ 
                        position: 'relative',
                        width: '80px',
                        height: '80px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => toggleAssetSelection(asset.id)}
                    >
                      <img 
                        src={asset.thumbnail} 
                        alt={asset.name} 
                        style={{ 
                          width: '100%', 
                          height: '100%',
                          objectFit: 'cover'
                        }} 
                      />
                      {isSelected && (
                        <div style={{ 
                          position: 'absolute', 
                          top: '4px', 
                          right: '4px', 
                          width: '20px', 
                          height: '20px', 
                          background: 'var(--accent)', 
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '11px',
                          fontWeight: '700'
                        }}>
                          {orderIndex + 1}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>{t('sheetBuilder.generateParams')}</h3>
              
              <div className="control-group">
                <label>{t('sheetBuilder.columns')}</label>
                <input 
                  type="number" 
                  min="1" 
                  value={columns} 
                  onChange={(e) => setColumns(parseInt(e.target.value) || 1)}
                  className="input"
                />
              </div>
              
              <div className="control-group">
                <label>{t('sheetBuilder.rows')}</label>
                <input 
                  type="number" 
                  min="1" 
                  value={rows} 
                  onChange={(e) => setRows(parseInt(e.target.value) || 1)}
                  className="input"
                />
              </div>
              
              <div className="control-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={autoSize} 
                    onChange={(e) => setAutoSize(e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  {t('sheetBuilder.autoSize')}
                </label>
              </div>
              
              {!autoSize && (
                <>
                  <div className="control-group">
                    <label>{t('sheetBuilder.cellWidth')}</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={cellWidth} 
                      onChange={(e) => setCellWidth(parseInt(e.target.value) || 1)}
                      className="input"
                    />
                  </div>
                  <div className="control-group">
                    <label>{t('sheetBuilder.cellHeight')}</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={cellHeight} 
                      onChange={(e) => setCellHeight(parseInt(e.target.value) || 1)}
                      className="input"
                    />
                  </div>
                </>
              )}
              
              <div className="control-group">
                <label>{t('sheetBuilder.padding')}</label>
                <input 
                  type="number" 
                  min="0" 
                  value={padding} 
                  onChange={(e) => setPadding(parseInt(e.target.value) || 0)}
                  className="input"
                />
              </div>
              
              <div className="control-group">
                <label>{t('sheetBuilder.scale')}</label>
                <input 
                  type="number" 
                  min="0.1" 
                  step="0.1" 
                  value={scale} 
                  onChange={(e) => setScale(parseFloat(e.target.value) || 1)}
                  className="input"
                />
              </div>
              
              <button 
                className="button button-primary" 
                onClick={generatePreview}
                style={{ width: '100%', height: '44px', marginTop: '24px' }}
              >
                {t('sheetBuilder.generate')}
              </button>
            </div>
          </div>
        </div>
        
        {/* 右侧预览区域 */}
        <div className="split-right">
          <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="preview-header">
              <div className="preview-title">{t('sheetBuilder.preview')}</div>
              <div className="preview-controls">
                <div className="badge">{Math.round(previewScale * 100)}%</div>
                <button 
                  className="button" 
                  onClick={fitToView}
                  style={{ padding: '6px 12px' }}
                >
                  {t('sheetBuilder.fitToView')}
                </button>
              </div>
            </div>
            
            {previewUrl ? (
              <div 
                className="checkerboard"
                ref={previewContainerRef}
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  position: 'relative',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  minHeight: '300px'
                }}
                onWheel={handleWheel}
                onMouseDown={(e) => {
                  console.log('鼠标按下');
                  handleMouseDown(e);
                }}
                onMouseMove={(e) => {
                  console.log('鼠标移动');
                  handleMouseMove(e);
                }}
                onMouseUp={() => {
                  console.log('鼠标释放');
                  handleMouseUp();
                }}
                onMouseLeave={() => {
                  console.log('鼠标离开');
                  handleMouseLeave();
                }}
              >
                <img 
                  ref={previewImageRef}
                  src={previewUrl} 
                  alt="Sprite Sheet Preview" 
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) scale(${previewScale})`,
                    transformOrigin: 'center',
                    transition: 'transform 0.1s ease-out',
                    background: 'transparent',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    pointerEvents: 'none' // 让鼠标事件穿透到容器
                  }}
                  onLoad={(e) => {
                    console.log('图片加载成功，尺寸:', e.currentTarget.naturalWidth, e.currentTarget.naturalHeight);
                    // 直接设置预览缩放为80%
                    setPreviewScale(0.8);
                    console.log('设置预览缩放为80%');
                  }}
                  onError={(e) => console.error('图片加载失败:', e)}
                />
              </div>
            ) : (
              <div 
                ref={previewContainerRef}
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  position: 'relative',
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-md)',
                  minHeight: '300px'
                }}
              />
            )}
            
            {previewUrl && (
              <div className="action-bar">
                <div className="action-left">
                  <div className="badge">{t('sheetBuilder.selectedCount')} {selectedAssets.length} 个帧</div>
                </div>
                <div className="action-right">
                  <button 
                    className="button button-primary" 
                    onClick={exportSpriteSheet}
                  >
                    {t('sheetBuilder.export')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <div className="error" style={{ marginTop: '16px' }}>{error}</div>}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default SheetBuilder;