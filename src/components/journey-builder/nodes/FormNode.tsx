'use client';

import React from 'react';
import { NodeProps } from '@xyflow/react';
import { FileText } from 'lucide-react';
import { BaseNode } from './BaseNode';

export function FormNode(props: NodeProps) {
  return (
    <BaseNode
      {...props}
      icon={<FileText className="h-4 w-4" />}
      color="bg-green-500"
    />
  );
}
