'use client';

import React from 'react';

interface ScreenReaderOnlyProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
}

export function ScreenReaderOnly({
  children,
  id,
  className = '',
}: ScreenReaderOnlyProps) {
  return (
    <span id={id} className={`sr-only ${className}`} aria-hidden="false">
      {children}
    </span>
  );
}
