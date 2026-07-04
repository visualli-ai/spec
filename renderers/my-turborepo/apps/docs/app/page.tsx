import React from 'react';
import { useMySdk } from '@mysdk/react';


export default function Home() {

  const { status, isReady } = useMySdk();

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>SDK Monorepo Test Playground</h1>
      <p>Status: <strong>{status}</strong></p>
      <p>Hook is working: {isReady ? "✅ Yes" : "❌ No"}</p>
    </div>
  );
}
