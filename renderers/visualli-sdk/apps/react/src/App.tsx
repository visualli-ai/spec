import React from 'react';
import { VisualliRenderer } from '@visualli/react';
import exampleString from '../../../../../examples/example.visualli?raw';

export default function App() {
  return (
    <VisualliRenderer
      visualliString={exampleString}
      useWorker={true}
      theme="light"
      width="100vw"
      height="100vh"
    />
  );
}
