import '@testing-library/jest-dom';

// Clean up sessionStorage between tests
beforeEach(() => {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    window.sessionStorage.clear();
  }
});
