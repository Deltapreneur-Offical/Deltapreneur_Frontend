import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { CocreationLegacyRedirect } from './cocreationRouteRedirect';

function LocationEcho() {
  const location = useLocation();
  return (
    <div>
      {location.pathname}
      {location.search}
      {location.hash}
    </div>
  );
}

describe('CocreationLegacyRedirect', () => {
  it('preserves path, search, and hash while redirecting', () => {
    render(
      <MemoryRouter initialEntries={['/cocreation/auction/abc?x=1#y']}>
        <Routes>
          <Route path="/cocreation/*" element={<CocreationLegacyRedirect />} />
          <Route path="/technology/*" element={<LocationEcho />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('/technology/auction/abc?x=1#y')).toBeInTheDocument();
  });
});
