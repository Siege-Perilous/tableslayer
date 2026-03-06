import type { ToastDataProps } from './types';

export type ToastItem = {
  id: string;
  data: ToastDataProps;
  timeout: ReturnType<typeof setTimeout> | null;
  remainingTime: number;
  pausedAt: number | null;
};

const DEFAULT_DURATION = 5000;

class ToastManager {
  toasts = $state<ToastItem[]>([]);
  isPaused = $state(false);

  private generateId = (): string => {
    return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  };

  addToast = (input: ToastDataProps | { data: ToastDataProps }, duration: number = DEFAULT_DURATION): string => {
    // Handle backwards compatibility with old melt-ui format { data: { title, type, body } }
    const data: ToastDataProps =
      'data' in input && input.data && typeof input.data === 'object' && 'title' in input.data
        ? input.data
        : (input as ToastDataProps);
    const id = this.generateId();
    const toast: ToastItem = {
      id,
      data,
      timeout: null,
      remainingTime: duration,
      pausedAt: null
    };

    if (data.type !== 'loading') {
      toast.timeout = setTimeout(() => {
        this.removeToast(id);
      }, duration);
    }

    this.toasts = [...this.toasts, toast];
    return id;
  };

  removeToast = (id: string): void => {
    const toast = this.toasts.find((t) => t.id === id);
    if (toast?.timeout) {
      clearTimeout(toast.timeout);
    }
    this.toasts = this.toasts.filter((t) => t.id !== id);
  };

  pauseAll = (): void => {
    if (this.isPaused) return;
    this.isPaused = true;

    this.toasts = this.toasts.map((toast) => {
      if (toast.timeout) {
        clearTimeout(toast.timeout);
        return {
          ...toast,
          timeout: null,
          pausedAt: Date.now(),
          remainingTime: toast.remainingTime - (toast.pausedAt ? 0 : Date.now() - (Date.now() - toast.remainingTime))
        };
      }
      return { ...toast, pausedAt: Date.now() };
    });
  };

  resumeAll = (): void => {
    if (!this.isPaused) return;
    this.isPaused = false;

    this.toasts = this.toasts.map((toast) => {
      if (toast.data.type !== 'loading' && toast.pausedAt) {
        const elapsed = Date.now() - toast.pausedAt;
        const remaining = Math.max(0, toast.remainingTime - elapsed);

        if (remaining > 0) {
          return {
            ...toast,
            timeout: setTimeout(() => {
              this.removeToast(toast.id);
            }, remaining),
            pausedAt: null,
            remainingTime: remaining
          };
        } else {
          setTimeout(() => this.removeToast(toast.id), 0);
          return toast;
        }
      }
      return { ...toast, pausedAt: null };
    });
  };

  updateToast = (id: string, data: Partial<ToastDataProps>): void => {
    this.toasts = this.toasts.map((toast) => {
      if (toast.id === id) {
        return { ...toast, data: { ...toast.data, ...data } };
      }
      return toast;
    });
  };
}

export const toastManager = new ToastManager();

export const addToast = toastManager.addToast;
export const removeToast = toastManager.removeToast;
