import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import JSZip from 'jszip';
import FrameExtractor from './modules/frame-extractor';
import SheetBuilder from './modules/sheet-builder';
import BgRemover from './modules/bg-remover';
import { useAssetStore } from './store/assetStore';
import wechatQR from './assets/wechat.jpg';
import paypalQR from './assets/paypal.jpg';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  return (
    <footer style={{
      borderTop: '1px solid var(--border-subtle)',
      marginTop: '60px',
      padding: '40px 24px',
      maxWidth: '1200px',
      margin: '60px auto 0',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '40px',
        flexWrap: 'wrap'
      }}>

        {/* 左侧：联系方式 */}
        <div>
          <h4 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '16px'
          }}>
            {t('contactUs')}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* 抖音 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>🎵</span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('tiktok')}：</span>
              <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>90758318785</span>
            </div>

            {/* Discord */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>💬</span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Discord：</span>
              <a 
                href="https://discord.gg/cr4EJqEjw6"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none' }}
              >
                {t('joinDiscord')}
              </a>
            </div>

            {/* QQ群 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>🐧</span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('qqGroup')}：</span>
              <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>643936282</span>
            </div>

          </div>
        </div>

        {/* 右侧：打赏区 */}
        <div>
          <h4 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '16px'
          }}>
            {t('supportDev')}
          </h4>
          <div style={{ display: 'flex', gap: '20px' }}>

            {/* 微信打赏 */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                padding: '8px', 
                background: '#ffffff', 
                borderRadius: 'var(--radius-md)', 
                display: 'inline-block', 
              }}>
                <img 
                  src={wechatQR} 
                  alt="微信收款码" 
                  style={{ width: '100px', height: '100px', display: 'block' }} 
                />
              </div>
              <p style={{ 
                fontSize: '12px', 
                color: 'var(--text-secondary)', 
                marginTop: '8px' 
              }}>{t('wechatPay')}</p>
            </div>

            {/* PayPal 打赏 */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                padding: '8px', 
                background: '#ffffff', 
                borderRadius: 'var(--radius-md)', 
                display: 'inline-block', 
              }}>
                <img 
                  src={paypalQR} 
                  alt="PayPal 收款码" 
                  style={{ width: '100px', height: '100px', display: 'block' }} 
                />
              </div>
              <p style={{ 
                fontSize: '12px', 
                color: 'var(--text-secondary)', 
                marginTop: '8px' 
              }}>{t('paypalPay')}</p>
            </div>

          </div>
        </div>
      </div>

      {/* 底部版权 */}
      <div style={{
        marginTop: '32px',
        paddingTop: '16px',
        borderTop: '1px solid var(--border-subtle)',
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--text-muted)'
      }}>
        Video2Sprite © {new Date().getFullYear()} · {t('copyright')}
      </div>
    </footer>
  );
};

const languages = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'en',    label: 'English'  },
  { code: 'ja',    label: '日本語'   },
  { code: 'ko',    label: '한국어'   },
];

function App() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'frame-extractor' | 'sheet-builder' | 'bg-remover'>('frame-extractor');
  const [currentTab, setCurrentTab] = useState<'frame-extractor' | 'sheet-builder' | 'bg-remover'>('frame-extractor');
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [showAssetPanel, setShowAssetPanel] = useState<boolean>(true);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { assets, deleteAsset: removeAsset, addAsset } = useAssetStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAssetPanel(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAddAssets = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataURL = reader.result as string;
        await addAsset({
          id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name.replace(/\.[^.]+$/, ''),
          type: 'frame',
          source: 'upload',
          createdAt: Date.now(),
          thumbnail: dataURL,
          blob: file,
        });
      };
      reader.readAsDataURL(file);
    }

    e.target.value = '';
  };

  const handleTabChange = (newTab: 'frame-extractor' | 'sheet-builder' | 'bg-remover') => {
    if (newTab === activeTab) return;

    setIsAnimating(true);
    setActiveTab(newTab);

    setTimeout(() => {
      setCurrentTab(newTab);
      setTimeout(() => {
        setIsAnimating(false);
      }, 250);
    }, 250);
  };

  const isAllSelected = assets.length > 0 && selectedAssets.length === assets.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(assets.map(a => a.id));
    }
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

  const deleteSelected = async () => {
    for (const id of selectedAssets) {
      await removeAsset(id);
    }
    setSelectedAssets([]);
  };

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAll = async () => {
    for (const asset of assets) {
      await removeAsset(asset.id);
    }
    setSelectedAssets([]);
    setShowClearConfirm(false);
  };

  const exportZip = async () => {
    const toExport = selectedAssets.length > 0
      ? assets.filter(a => selectedAssets.includes(a.id))
      : assets;

    if (toExport.length === 0) {
      alert('没有可导出的资产');
      return;
    }

    try {
      const zip = new JSZip();

      for (const asset of toExport) {
        let blob: Blob | null = null;

        if (asset.blob) {
          blob = asset.blob;
        } else if (asset.thumbnail) {
          const response = await fetch(asset.thumbnail);
          blob = await response.blob();
        }

        if (blob) {
          zip.file(`${asset.name}.png`, blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `video2sprite-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('ZIP 导出失败:', err);
      alert('导出失败：' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="logo">Video2Sprite</div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            background: 'rgba(52, 211, 153, 0.12)',
            border: '1px solid rgba(52, 211, 153, 0.3)',
            borderRadius: '20px',
            fontSize: '12px',
            color: '#34d399',
            fontWeight: 500,
            whiteSpace: 'nowrap'
          }}>
            <span>🌿</span>
            <span>{t('openSource')}</span>
          </div>
        </div>
        <nav className="nav-tabs">
          <div 
            className={`nav-tab ${activeTab === 'frame-extractor' ? 'active' : ''}`}
            onClick={() => handleTabChange('frame-extractor')}
          >
            {t('nav.frameExtractor')}
          </div>
          <div 
            className={`nav-tab ${activeTab === 'sheet-builder' ? 'active' : ''}`}
            onClick={() => handleTabChange('sheet-builder')}
          >
            {t('nav.sheetBuilder')}
          </div>
          <div 
            className={`nav-tab ${activeTab === 'bg-remover' ? 'active' : ''}`}
            onClick={() => handleTabChange('bg-remover')}
          >
            {t('nav.bgRemover')}
          </div>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select 
            value={i18n.language} 
            onChange={(e) => {
              i18n.changeLanguage(e.target.value);
              localStorage.setItem('video2sprite-lang', e.target.value);
            }}
            style={{ 
              background: 'var(--bg-input)', 
              color: 'var(--text-primary)', 
              border: '1px solid var(--border-subtle)', 
              borderRadius: 'var(--radius-sm)', 
              padding: '6px 10px', 
              fontSize: '13px', 
              cursor: 'pointer', 
              outline: 'none', 
            }} 
          > 
            {languages.map(lang => ( 
              <option key={lang.code} value={lang.code}>{lang.label}</option> 
            ))} 
          </select>
          <button 
            className="button"
            onClick={() => setShowAssetPanel(!showAssetPanel)}
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            {t('showAssets')}
          </button>
        </div>
      </header>
      <main className="main">
        <div className={isAnimating ? 'page-exit' : 'page-enter'}>
          {currentTab === 'frame-extractor' && <FrameExtractor />}
          {currentTab === 'sheet-builder' && <SheetBuilder />}
          {currentTab === 'bg-remover' && <BgRemover />}
        </div>
        <Footer />
      </main>
    {createPortal(
      <>
        <div 
          onClick={() => setShowAssetPanel(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: showAssetPanel ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0)',
            zIndex: 999,
            pointerEvents: showAssetPanel ? 'all' : 'none',
            transition: 'background var(--duration-base) var(--ease-standard)'
          }}
        />
        <div className={`sidebar ${showAssetPanel ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
          <div style={{ 
            width: '360px', 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column', 
            background: 'var(--bg-card)', 
            borderLeft: '1px solid var(--border-subtle)', 
          }}>
            {/* 顶部标题，固定不滚动 */}
            <div style={{ 
              padding: '20px 16px 12px', 
              borderBottom: '1px solid var(--border-subtle)', 
              flexShrink: 0 
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                {t('assetPool.title')}
              </h3>

              {/* 工具栏：全选 + 删除 + 清空，单行不换行 */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                gap: '8px', 
                flexWrap: 'nowrap' 
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flexShrink: 0 }}>
                  <input 
                    type="checkbox" 
                    checked={isAllSelected} 
                    onChange={toggleSelectAll} 
                    style={{ accentColor: 'var(--accent)', width: '15px', height: '15px' }} 
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {t('assetPool.selectAll')}（{selectedAssets.length}/{assets.length}）
                  </span>
                </label>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleAddAssets}
                  />
                  <button 
                    className="button button-primary" 
                    onClick={() => fileInputRef.current?.click()}
                    style={{ padding: '4px 10px', fontSize: '12px', whiteSpace: 'nowrap' }}
                  >
                    {t('assetPool.add')}
                  </button>
                  <button 
                    className="button" 
                    onClick={deleteSelected} 
                    disabled={selectedAssets.length === 0} 
                    style={{ padding: '4px 10px', fontSize: '12px', whiteSpace: 'nowrap', opacity: selectedAssets.length === 0 ? 0.4 : 1 }} 
                  >
                    {t('assetPool.deleteSelected')}（{selectedAssets.length}）
                  </button>
                  <button 
                    className="button" 
                    onClick={handleClearAll} 
                    style={{ padding: '4px 10px', fontSize: '12px', whiteSpace: 'nowrap', color: 'var(--danger)' }} 
                  >
                    {t('assetPool.clear')}
                  </button>
                </div>
              </div>
            </div>

            {/* 中间资产列表，可滚动 */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '12px 16px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px' 
            }}>
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
                  <p>{t('assetPool.title')} {t('assetPool.clear')}</p>
                </div>
              ) : (
                assets.map(asset => (
                  <div key={asset.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    padding: '10px 12px', 
                    background: 'var(--bg-input)', 
                    borderRadius: 'var(--radius-md)', 
                    border: selectedAssets.includes(asset.id)
                      ? '1px solid var(--accent)'
                      : '1px solid transparent', 
                  }}>
                    <input 
                      type="checkbox" 
                      checked={selectedAssets.includes(asset.id)} 
                      onChange={() => toggleAssetSelection(asset.id)} 
                      style={{ accentColor: 'var(--accent)', width: '15px', height: '15px', flexShrink: 0 }} 
                    />
                    <img 
                      src={asset.thumbnail} 
                      style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} 
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: '13px', 
                        color: 'var(--text-primary)', 
                        fontWeight: 500, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap' 
                      }}>
                        {asset.name} 
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {asset.source}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 底部导出按钮，固定不滚动 */}
            <div style={{ 
              padding: '12px 16px', 
              borderTop: '1px solid var(--border-subtle)', 
              flexShrink: 0 
            }}>
              <button 
                className="button button-primary" 
                onClick={exportZip} 
                style={{ width: '100%', height: '44px', fontSize: '14px', fontWeight: 600 }} 
              >
                {t('assetPool.exportZip')}
                {selectedAssets.length > 0 && `（${selectedAssets.length}）`}
              </button>
            </div>

            {/* 清空确认弹窗 */}
            {showClearConfirm && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                borderRadius: 'inherit'
              }}>
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                  width: '240px',
                  textAlign: 'center'
                }}>
                  <p style={{ color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 600 }}>
                    {t('assetPool.confirmClear')}
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                    {assets.length} {t('assetPool.confirmClearDesc')}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                      className="button"
                      onClick={() => setShowClearConfirm(false)}
                      style={{ flex: 1 }}
                    >
                      {t('assetPool.cancel')}
                    </button>
                    <button
                      className="button button-danger"
                      onClick={confirmClearAll}
                      style={{ flex: 1 }}
                    >
                      {t('assetPool.confirm')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </>,
      document.body
    )}
    </div>
  );
}

export default App;
