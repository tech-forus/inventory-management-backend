const EVENT_NAME = 'nexusinv:inventory-updated';

export function emitInventoryUpdated(): void {
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function onInventoryUpdated(handler: () => void): () => void {
  const listener = () => handler();
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}


