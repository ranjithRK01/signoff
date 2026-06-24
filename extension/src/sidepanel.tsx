import React from 'react';
import ReactDOM from 'react-dom/client';
import SidebarApp from './components/SidebarApp';
import './index.css';

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <SidebarApp />
    </React.StrictMode>
  );
}
