import React from 'react';
import { VisualliRenderer } from '@mysdk/react';
import { VISUALLI_JSONL } from './data/visualliJson';

export default function App() {
  return (
    <VisualliRenderer
      visualliString={VISUALLI_JSONL}
      useWorker={true}
      theme="light"
      width="100vw"
      height="100vh"
    />
  );
}
