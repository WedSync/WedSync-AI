'use client';

import React from 'react';
import { NodeProps } from '@xyflow/react';
import { Star } from 'lucide-react';
import { BaseNode } from './BaseNode';

export function ReviewNode(props: NodeProps) {
  return (
    <BaseNode
      {...props}
      icon={<Star className="h-4 w-4" />}
      color="bg-yellow-500"
    />
  );
}
