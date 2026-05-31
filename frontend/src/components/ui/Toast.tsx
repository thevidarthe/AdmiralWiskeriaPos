'use client';
import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          background: '#0F1B33',
          color: '#F4ECD5',
          border: '1px solid rgba(232,201,106,0.35)',
          borderRadius: '12px',
          fontSize: '13px',
        },
        success: { iconTheme: { primary: '#5ECB8A', secondary: '#0F1B33' } },
        error:   { iconTheme: { primary: '#E74C5C', secondary: '#0F1B33' } },
      }}
    />
  );
}
