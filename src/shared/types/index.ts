export interface Asset {
  id: string;
  name: string;
  type: 'frame' | 'sprite-sheet' | 'processed-image';
  source: 'frame-extractor' | 'sheet-builder' | 'bg-remover' | 'upload';
  createdAt: number;
  thumbnail: string; // 缩略图 Blob URL
  blob: Blob;
}

export interface Frame {
  id: string;
  imageUrl: string;
  index: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface Command {
  execute(): void;
  undo(): void;
}

export interface HistoryManager {
  push(command: Command): void;
  undo(): void;
  redo(): void;
}
