// 直接 import 本地库，不走 node_modules
// @ts-ignore
import { removeBackground } from '../../public/bgremoval/index.mjs';

self.onmessage = async (e: MessageEvent) => {
  const { imageBlob } = e.data;
  try {
    self.postMessage({ type: 'progress', message: '处理中...' });

    const result = await removeBackground(imageBlob, {
      output: { format: 'image/png', quality: 1.0 },
      debug: true,
    });

    console.log('result 类型:', typeof result);
    console.log('result 值:', result);
    self.postMessage({ type: 'success', result });
  } catch (error) {
    console.error('Worker 内部错误:', error);
    self.postMessage({ type: 'error', error: String(error) });
  }
};
