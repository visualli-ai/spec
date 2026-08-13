import React from 'react';
import { VisualliRenderer } from '@visualli/react';
import { VISUALLI_STRING } from '../public/examples/example_string';

export default function App() {
  return (
    <VisualliRenderer
      visualliFile="/examples/example.visualli"
      // visualliString={VISUALLI_STRING}
      useWorker={true}
      theme="light"
      width="100vw"
      height="100vh"
    />
  );
}
