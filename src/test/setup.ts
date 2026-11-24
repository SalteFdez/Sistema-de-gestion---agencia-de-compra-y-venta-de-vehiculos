import '@testing-library/jest-dom/vitest';

// jsdom no trae las URLs de objeto (vista previa de fotos): un respaldo para los tests
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:mock';
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = () => {};
}
