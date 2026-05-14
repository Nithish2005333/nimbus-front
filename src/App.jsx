import { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { UploadProvider } from './context/UploadContext';
import AppRouter from './router/AppRouter';
import SplashScreen from './components/SplashScreen';

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Force minimum splash screen time
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000); // 2 seconds exactly

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <UploadProvider>
          <AppRouter />
        </UploadProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
