type ToastType = 'success' | 'error' | 'info';
type ToastListener = (message: string, type: ToastType) => void;

class ToastService {
  private listeners: ToastListener[] = [];

  subscribe(listener: ToastListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(message: string, type: ToastType) {
    this.listeners.forEach(l => l(message, type));
  }

  success(msg: string) { this.notify(msg, 'success'); }
  error(msg: string) { this.notify(msg, 'error'); }
  info(msg: string) { this.notify(msg, 'info'); }
}

export const toast = new ToastService();