import React, { useEffect, useState } from 'react';
import { useAssetStore } from '../store/assetStore';

interface AssetPoolProps {
  selectedAssets: string[];
  toggleAssetSelection: (assetId: string) => void;
}

const AssetPool: React.FC<AssetPoolProps> = ({ selectedAssets, toggleAssetSelection }) => {
  const { assets, isLoading, error, loadAssets, addAsset } = useAssetStore();
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleAddImages = (files: File[]) => {
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/') && 
      ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
    );

    imageFiles.forEach(async (file) => {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const imageUrl = e.target?.result as string;
          const blob = new Blob([file], { type: file.type });

          await addAsset({
            id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            type: 'frame',
            source: 'upload',
            createdAt: Date.now(),
            thumbnail: imageUrl,
            blob
          });
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error('添加图片失败:', err);
      }
    });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleAddImages(Array.from(files));
    }
  };

  if (isLoading) {
    return <div className="loading">加载资产中...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div>
      <div 
        className={`asset-list ${isDragging ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          minHeight: '200px',
          padding: '16px',
          borderRadius: '8px'
        }}
      >
        {assets.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: 'var(--text-muted)', 
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
            <p>资产池为空</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>拖拽文件到此处添加图片</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {assets.map((asset) => (
              <div 
                key={asset.id} 
                className="asset-item"
                style={{ 
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  transition: 'all 0.2s ease'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedAssets.includes(asset.id)}
                  onChange={() => toggleAssetSelection(asset.id)}
                  style={{
                    accentColor: 'var(--accent)',
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer',
                    flexShrink: 0,
                    marginRight: '12px'
                  }}
                />
                <div style={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                  marginRight: '12px',
                  background: 'var(--bg-card)'
                }}>
                  <img 
                    src={asset.thumbnail} 
                    alt={asset.name} 
                    style={{ 
                      width: '100%', 
                      height: '100%',
                      objectFit: 'cover'
                    }} 
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontSize: '13px', 
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginBottom: '4px'
                  }}>
                    {asset.name}
                  </div>
                  <div style={{ 
                    fontSize: '10px', 
                    color: 'var(--text-muted)',
                    background: 'var(--bg-card)',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    display: 'inline-block'
                  }}>
                    {asset.source}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetPool;