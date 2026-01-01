const EVENT_NAME = 'nexusinv:categories-updated';

export function emitCategoriesUpdated(): void {
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function onCategoriesUpdated(handler: () => void): () => void {
  const listener = () => handler();
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}



