import { describe, it, expect } from 'vitest';
import pagina from '../pages/index.astro?raw';
import manifestTexto from '../../public/manifest.json?raw';

// Vitest no devuelve el contenido de los .css con ?raw, así que el CSS se lee del disco.
// El proyecto no tiene tipos de Node: el módulo se importa por nombre en una variable.
const nombreFs = 'node:fs';
const fs = (await import(/* @vite-ignore */ nombreFs)) as { readFileSync(ruta: string, codificacion: string): string };
const raiz = (globalThis as unknown as { process: { cwd(): string } }).process.cwd();

const manifest = JSON.parse(manifestTexto);
const estilos = fs.readFileSync(`${raiz}/src/styles/global.css`, 'utf8');

describe('manifest: la app se instala con sus íconos PNG', () => {
  it('lista los tres PNG con su tamaño y propósito, y no lista icon.svg', () => {
    expect(manifest.icons).toEqual([
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ]);
    expect(JSON.stringify(manifest.icons)).not.toContain('icon.svg');
  });

  it('tiene id, idioma, orientación vertical y los colores: la pantalla de arranque es negra con el logo', () => {
    expect(manifest.id).toBe('/');
    expect(manifest.lang).toBe('es-AR');
    expect(manifest.orientation).toBe('portrait');
    expect(manifest.theme_color).toBe('#2563eb');
    expect(manifest.background_color).toBe('#0B0B0B');
  });
});

describe('index.astro: ícono de iPhone y zonas seguras', () => {
  it('tiene el apple-touch-icon de 180 px', () => {
    expect(pagina).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png" />');
  });

  it('el viewport usa viewport-fit=cover, sin bloquear el zoom', () => {
    expect(pagina).toContain('viewport-fit=cover');
    expect(pagina).not.toContain('user-scalable');
  });

  it('icon.svg queda como favicon', () => {
    expect(pagina).toContain('<link rel="icon" type="image/svg+xml" href="/icon.svg" />');
  });

  it('la barra de estado de iOS sigue en default (fondo claro)', () => {
    expect(pagina).toContain('content="default"');
  });
});

describe('global.css: respuesta al toque', () => {
  it('sin el recuadro del navegador al tocar, y sin demora del doble toque en botones y enlaces', () => {
    expect(estilos).toContain('-webkit-tap-highlight-color: transparent');
    expect(estilos).toMatch(/button,\s*a,\s*\[role=button\][^{]*\{[^}]*touch-action:\s*manipulation/);
  });
});
