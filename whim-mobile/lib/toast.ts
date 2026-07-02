import { create } from 'zustand';

// Minimal app-wide toast. The store's optimistic writes call `toast()` when a
// background persist fails, so the user knows instead of the item silently
// vanishing on the next hydrate. Host component: components/Toast.tsx.
interface ToastState {
  message: string | null;
  show: (message: string) => void;
  hide: () => void;
}

let timer: ReturnType<typeof setTimeout> | null = null;

export const useToast = create<ToastState>((set) => ({
  message: null,
  show: (message) => {
    if (timer) clearTimeout(timer);
    set({ message });
    timer = setTimeout(() => set({ message: null }), 3200);
  },
  hide: () => {
    if (timer) clearTimeout(timer);
    set({ message: null });
  },
}));

export const toast = (message: string) => useToast.getState().show(message);
