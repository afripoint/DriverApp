import { createElement, type PropsWithChildren, type DragEvent } from 'react';
export function ProofDropZone({ children, onFiles }: PropsWithChildren<{ onFiles: (files: File[]) => void }>) {
  return createElement('div', {
    onDragOver: (event: DragEvent<HTMLDivElement>) => event.preventDefault(),
    onDrop: (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); onFiles(Array.from(event.dataTransfer.files)); },
    style: { display: 'flex', flexDirection: 'column' },
  }, children);
}
