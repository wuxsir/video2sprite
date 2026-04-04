import { create } from 'zustand';
import { Command } from '../shared/types';

interface HistoryStore {
  history: Command[];
  currentIndex: number;
  push: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  history: [],
  currentIndex: -1,

  push: (command: Command) => {
    const { history, currentIndex } = get();
    // 清除当前索引之后的历史记录
    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(command);
    command.execute();
    set({ history: newHistory, currentIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { history, currentIndex } = get();
    if (currentIndex >= 0) {
      history[currentIndex].undo();
      set({ currentIndex: currentIndex - 1 });
    }
  },

  redo: () => {
    const { history, currentIndex } = get();
    if (currentIndex < history.length - 1) {
      const nextIndex = currentIndex + 1;
      history[nextIndex].execute();
      set({ currentIndex: nextIndex });
    }
  },

  clear: () => {
    set({ history: [], currentIndex: -1 });
  }
}));
