import React from 'react';
import { VisualliRenderer } from '@visualli/react';
import { VISUALLI_STRING } from './data/string';

export default function App() {
  return (
    <VisualliRenderer
      visualliFile="/src/data/data.visualli"
      // visualliString={VISUALLI_STRING}
      useWorker={true}
      theme="light"
      width="100vw"
      height="100vh"
    />
  );
}
