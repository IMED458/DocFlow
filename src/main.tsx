import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {installMockApi} from './mockApi.ts';
import {initAnalytics} from './firebase.ts';
import App from './App.tsx';
import './index.css';

installMockApi();
void initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
