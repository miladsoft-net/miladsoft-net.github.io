import { writable } from 'svelte/store';

interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

function createToastStore() {
  const { subscribe, update } = writable<ToastMessage[]>([]);
  let id = 0;

  function show(message: string, type: ToastMessage['type']) {
    const toastId = ++id;
    update(messages => [...messages, { id: toastId, type, message }]);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      update(messages => messages.filter(m => m.id !== toastId));
    }, 3000);
  }

  return {
    subscribe,
    success: (message: string) => show(message, 'success'),
    error: (message: string) => show(message, 'error'),
    info: (message: string) => show(message, 'info'),
    warning: (message: string) => show(message, 'warning')
  };
}

export const toast = createToastStore();
export default toast;
