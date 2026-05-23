import React, { useState, useEffect } from 'react';
import { initDb } from './src/lib/sqlite';
import { AuthProvider } from './src/lib/auth-context';
import { RootNavigator } from './src/navigation/root-navigator';

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDb().then(() => setDbReady(true)).catch(console.error);
  }, []);

  if (!dbReady) return null;

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
