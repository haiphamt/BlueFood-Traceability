'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    L?: {
      map: (element: HTMLElement, options?: Record<string, unknown>) => {
        setView: (coords: [number, number], zoom: number) => unknown;
      };
      tileLayer: (url: string, options?: Record<string, unknown>) => { addTo: (map: unknown) => unknown };
      marker: (coords: [number, number]) => { addTo: (map: unknown) => { bindPopup: (text: string) => unknown } };
    };
  }
}

const VIETNAM_CENTER: [number, number] = [16.0471, 108.2068];

function loadLeaflet() {
  if (window.L) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    if (!document.querySelector('link[data-bluefood-leaflet]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.dataset.bluefoodLeaflet = 'true';
      document.head.appendChild(link);
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-bluefood-leaflet]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Leaflet failed to load')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.dataset.bluefoodLeaflet = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Leaflet failed to load'));
    document.body.appendChild(script);
  });
}

interface LazySupplierMapProps {
  label: string;
}

export function LazySupplierMap({ label }: LazySupplierMapProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let initialized = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || initialized || !mapRef.current) return;
        initialized = true;
        observer.disconnect();

        loadLeaflet()
          .then(() => {
            if (!window.L || !mapRef.current) return;
            const map = window.L.map(mapRef.current, {
              zoomControl: false,
              attributionControl: false,
              dragging: false,
              scrollWheelZoom: false,
              doubleClickZoom: false,
            }).setView(VIETNAM_CENTER, 5);
            window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
            }).addTo(map);
            window.L.marker(VIETNAM_CENTER).addTo(map).bindPopup(label);
          })
          .catch(() => setFailed(true));
      },
      { rootMargin: '160px' }
    );

    observer.observe(root);
    return () => observer.disconnect();
  }, [label]);

  return (
    <div ref={rootRef} className="overflow-hidden rounded-lg border border-trace-line bg-trace-paper">
      <div ref={mapRef} className="flex h-40 items-center justify-center text-sm font-medium text-trace-muted">
        {failed ? 'Không tải được bản đồ' : label}
      </div>
    </div>
  );
}
