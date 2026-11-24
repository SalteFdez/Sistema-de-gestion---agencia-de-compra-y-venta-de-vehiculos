import { describe, it, expect } from 'vitest';
import pagina from '../pages/index.astro?raw';

describe('hoja de estilos base', () => {
  it('la página importa la hoja, no bloquea el zoom y ya no copia el CSS a mano', () => {
    expect(pagina).toContain("import '../styles/global.css'");
    expect(pagina).not.toContain('user-scalable');
    expect(pagina).not.toContain('maximum-scale');
    expect(pagina).not.toContain('<style is:global>');
  });
});
