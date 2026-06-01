import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// İlk boyama tamamlandıktan sonra geçişleri yeniden etkinleştir.
// 'no-transitions' sınıfı index.html bootstrap'inde eklenir; bu sayede
// sayfa ilk yüklenirken body/glow transition'ları tetiklenip flicker
// yaratmaz. İki rAF bekleyerek ilk boyamanın bittiğinden emin oluyoruz.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.documentElement.classList.remove('no-transitions');
  });
});
