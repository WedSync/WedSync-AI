'use client';

import React from 'react';
import { NodeProps } from '@xyflow/react';
import { Split } from 'lucide-react';
import { BaseNode } from './BaseNode';

export function SplitNode(props: NodeProps) {
  return (
    <BaseNode
      {...props}
      icon={<Split className="h-4 w-4" />}
      color="bg-pink-500"
    />
  );
}
