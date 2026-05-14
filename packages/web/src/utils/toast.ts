let container: HTMLDivElement | null = null;

function getContainer(): HTMLDivElement {
  if (!container) {
    container = document.createElement('div');
    container.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2';
    document.body.appendChild(container);
  }
  return container;
}

export function toast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const el = document.createElement('div');
  const bgMap = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-slate-700',
  };
  el.className = `${bgMap[type]} text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 toast-enter`;
  el.textContent = message;
  getContainer().appendChild(el);

  requestAnimationFrame(() => {
    el.classList.remove('toast-enter');
    el.classList.add('toast-show');
  });

  setTimeout(() => {
    el.classList.add('toast-exit');
    setTimeout(() => el.remove(), 300);
  }, 3000);
}
