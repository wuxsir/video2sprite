import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAssetStore } from '../../store/assetStore';
import { Frame } from '../../shared/types';

const FrameExtractor: React.FC = () => {
  const { t } = useTranslation();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [selectedFrames, setSelectedFrames] = useState<string[]>([]);
  const [frameStep, setFrameStep] = useState<number>(1);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { addAsset } = useAssetStore();

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setFrames([]);
      setSelectedFrames([]);
      setError(null);
    }
  };

  const extractFrames = async () => {
    if (!videoFile) {
      setError('请先上传视频文件');
      return;
    }

    setIsExtracting(true);
    setError(null);
    setFrames([]);
    setSelectedFrames([]);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (!video || !canvas || !ctx) {
        throw new Error('Video or canvas not available');
      }

      const videoUrl = URL.createObjectURL(videoFile);
      video.src = videoUrl;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          resolve();
        };
        video.onerror = () => {
          reject(new Error('Failed to load video'));
        };
      });

      const duration = video.duration;
      const frameRate = 30; // 假设30fps
      const totalFrames = Math.floor(duration * frameRate);
      const extractedFrames: Frame[] = [];

      for (let i = 0; i < totalFrames; i += frameStep) {
        video.currentTime = i / frameRate;
        await new Promise<void>((resolve) => {
          video.onseeked = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            const imageUrl = canvas.toDataURL('image/png');
            extractedFrames.push({
              id: `frame-${i}`,
              imageUrl,
              index: i
            });
            resolve();
          };
        });
      }

      setFrames(extractedFrames);
      URL.revokeObjectURL(videoUrl);
    } catch (err) {
      setError('提取帧失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setIsExtracting(false);
    }
  };

  const toggleFrameSelection = (frameId: string) => {
    setSelectedFrames(prev => {
      if (prev.includes(frameId)) {
        return prev.filter(id => id !== frameId);
      } else {
        return [...prev, frameId];
      }
    });
  };

  const sendToAssetPool = async () => {
    const selectedFrameObjects = frames.filter(frame => selectedFrames.includes(frame.id));
    if (selectedFrameObjects.length === 0) {
      setError('请先选择要发送的帧');
      return;
    }

    try {
      for (const frame of selectedFrameObjects) {
        // 将data URL转换为Blob
        const response = await fetch(frame.imageUrl);
        const blob = await response.blob();
        
        await addAsset({
          id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: `Frame ${frame.index}`,
          type: 'frame',
          source: 'frame-extractor',
          createdAt: Date.now(),
          thumbnail: frame.imageUrl,
          blob
        });
      }
      alert('帧已成功添加到资产池');
    } catch (err) {
      setError('发送到资产池失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setVideoFile(file);
      setFrames([]);
      setSelectedFrames([]);
      setError(null);
    }
  };

  return (
    <div>
      <h2 className="module-header">{t('frameExtractor.title')}</h2>
      <p className="module-subheader">{t('frameExtractor.subtitle')}</p>
      
      <div className="card">
        <div 
          className={`upload-area ${isDragging ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('video-upload')?.click()}
        >
          <input 
            id="video-upload"
            type="file" 
            accept="video/mp4,video/webm,image/gif" 
            onChange={handleVideoUpload}
            style={{ display: 'none' }}
          />
          <div className="upload-icon">↑</div>
          <div className="upload-text">{t('frameExtractor.uploadHint')}</div>
          <div className="upload-subtext">{t('frameExtractor.uploadFormats')}</div>
        </div>
      </div>

      {videoFile && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="control-group" style={{ marginBottom: '16px' }}>
            <label>{t('frameExtractor.frameSpan')}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <input 
                type="number" 
                min="1" 
                value={frameStep} 
                onChange={(e) => setFrameStep(parseInt(e.target.value) || 1)}
                className="input"
                style={{ width: '80px' }}
              />
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={frameStep} 
                onChange={(e) => setFrameStep(parseInt(e.target.value))}
                className="slider"
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              className="button button-primary" 
              onClick={extractFrames}
              disabled={isExtracting}
            >
              {isExtracting ? (
                <div className="loading" style={{ margin: 0 }}>
                  提取中...
                </div>
              ) : '提取帧'}
            </button>
          </div>
        </div>
      )}

      {error && <div className="error" style={{ marginTop: '16px' }}>{error}</div>}

      {frames.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div className="badge">{t('frameExtractor.totalFrames')}：{frames.length}</div>
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              height: '36px', 
              background: 'var(--bg-input)', 
              borderRadius: 'var(--radius-sm)', 
              padding: '0 12px',
              marginBottom: '16px'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedFrames.length === frames.length && frames.length > 0}
                  onChange={() => {
                    if (selectedFrames.length === frames.length) {
                      setSelectedFrames([]);
                    } else {
                      setSelectedFrames(frames.map(f => f.id));
                    }
                  }}
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  {t('frameExtractor.selectAll')}（{selectedFrames.length}/{frames.length}）
                </span>
              </label>
            </div>
            <div className="frame-grid">
              {frames.map((frame, index) => (
                <div 
                  key={frame.id}
                  className={`frame-item ${selectedFrames.includes(frame.id) ? 'selected' : ''} frame-card`}
                  style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
                  onClick={() => toggleFrameSelection(frame.id)}
                >
                  <img src={frame.imageUrl} alt={`Frame ${frame.index}`} />
                  <div className="frame-number">{frame.index}</div>
                  {selectedFrames.includes(frame.id) && (
                    <div className="frame-checkbox">✓</div>
                  )}
                </div>
              ))}
            </div>
            <div className="action-bar">
              <div className="action-left">
                <div className="badge">{t('frameExtractor.selected')} {selectedFrames.length} {t('frameExtractor.frames')}</div>
              </div>
              <div className="action-right">
                <button 
                  className="button button-primary" 
                  onClick={sendToAssetPool}
                  disabled={selectedFrames.length === 0}
                >
                  {t('frameExtractor.sendToPool')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 隐藏的视频和画布元素 */}
      <video ref={videoRef} style={{ display: 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default FrameExtractor;