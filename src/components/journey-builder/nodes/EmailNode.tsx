'use client';

import React from 'react';
import { NodeProps } from '@xyflow/react';
import { Mail } from 'lucide-react';
import { OverflowBaseNode } from './OverflowBaseNode';

export function EmailNode(props: NodeProps) {
  return (
    <OverflowBaseNode
      {...props}
      icon={<Mail className="h-5 w-5" />}
      gradient="from-blue-500 to-cyan-400"
      glowColor="rgba(59, 130, 246, 0.5)"
    />
  );
}
