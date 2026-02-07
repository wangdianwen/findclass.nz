import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ConfigProvider } from 'antd';
import App from './App';
import './styles/globals.scss';
import './locales/i18n';

// MSW 初始化状态
let mswReady = false;
let mswError: Error | null = null;

// 初始化 MSW mock server
async function initMSW() {
  if (import.meta.env.DEV) {
    try {
      console.log('[MSW] Starting initialization...');
      // Import the browser module which has initMockServer
      const { initMockServer } = await import('./mocks/browser');
      await initMockServer();
      mswReady = true;
      console.log('[MSW] Mock server ready');
    } catch (error) {
      mswError = error instanceof Error ? error : new Error(String(error));
      console.error('[MSW] Initialization failed:', mswError.message);
    }
  } else {
    // In production, mark MSW as ready immediately
    mswReady = true;
    console.log('[MSW] Production mode - skipping mock server');
  }
}

// Start MSW initialization immediately
initMSW();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Loading component while MSW is initializing
const AppLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for MSW to be ready
    if (mswReady) {
      setIsReady(true);
    } else if (mswError) {
      // If MSW failed, still render the app (real API will be used)
      console.warn('[MSW] Failed to initialize, using real API');
      setIsReady(true);
    } else {
      // Poll for MSW readiness
      const checkReady = setInterval(() => {
        if (mswReady || mswError) {
          setIsReady(true);
          clearInterval(checkReady);
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkReady);
        setIsReady(true);
      }, 10000);

      return () => clearInterval(checkReady);
    }
  }, []);

  if (!isReady) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ fontSize: '18px' }}>Loading...</div>
        <div style={{ fontSize: '14px', color: '#666' }}>Initializing mock server...</div>
      </div>
    );
  }

  return <>{children}</>;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools initialIsOpen={false} />
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#0ea5e9',
            borderRadius: 6,
          },
        }}
      >
        <BrowserRouter>
          <AppLoader>
            <App />
          </AppLoader>
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
