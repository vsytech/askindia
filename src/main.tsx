import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { env } from './utils/env';

// ── Analytics Bootstrap (production only) ─────────────────────────────────
if (env.features.analytics && env.isProd) {

  // Google Analytics 4
  if (env.ga4MeasurementId) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${env.ga4MeasurementId}`;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    function gtag(..._args: unknown[]) { window.dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', env.ga4MeasurementId, { send_page_view: true });
    (window as unknown as Record<string, unknown>).gtag = gtag;
  }

  // Meta Pixel
  if (env.metaPixelId) {
    const s = document.createElement('script');
    s.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${env.metaPixelId}');fbq('track','PageView');`;
    document.head.appendChild(s);
  }

  // Microsoft Clarity
  if (env.clarityProjectId) {
    const s = document.createElement('script');
    s.innerHTML = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${env.clarityProjectId}");`;
    document.head.appendChild(s);
  }
}

// ── Console branding + silence in prod ────────────────────────────────────
if (env.isProd) {
  console.log(
    '%c AskIndia %c v' + env.appVersion + ' ',
    'background:#0D1F6E;color:#fff;font-weight:700;padding:3px 8px;border-radius:4px 0 0 4px',
    'background:#F97316;color:#fff;font-weight:700;padding:3px 8px;border-radius:0 4px 4px 0'
  );
  // Suppress debug noise in production
  console.log   = () => {};
  console.debug = () => {};
  console.info  = () => {};
}

// ── Mount ─────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ── Global type augmentation for analytics ────────────────────────────────
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag:    (...args: unknown[]) => void;
    fbq:     (...args: unknown[]) => void;
    clarity: (...args: unknown[]) => void;
  }
}
