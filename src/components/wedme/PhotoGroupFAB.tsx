'use client';

import { PlusIcon } from '@heroicons/react/24/outline';

interface PhotoGroupFABProps {
  onClick: () => void;
}

export function PhotoGroupFAB({ onClick }: PhotoGroupFABProps) {
  return (
    <button
      onClick={onClick}
      className="
        fixed bottom-20 right-4 z-40
        w-14 h-14 bg-gradient-to-r from-pink-500 to-purple-500
        rounded-full shadow-lg
        flex items-center justify-center
        text-white touch-manipulation
        active:scale-95 transition-transform
        hover:shadow-xl
      "
      style={{ minHeight: '56px', minWidth: '56px' }}
      aria-label="Create new photo group"
    >
      <PlusIcon className="w-6 h-6" />
    </button>
  );
}
