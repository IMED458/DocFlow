import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {installMockApi} from './mockApi.ts';
import App from './App.tsx';
import './index.css';

installMockApi();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
