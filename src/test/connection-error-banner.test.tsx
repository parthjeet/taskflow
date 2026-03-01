import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConnectionErrorBanner } from '@/components/ConnectionErrorBanner';
import { describe, it, expect } from 'vitest';

describe('ConnectionErrorBanner', () => {
  it('renders nothing when visible is false', () => {
    const { container } = render(
      <MemoryRouter>
        <ConnectionErrorBanner visible={false} />
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders alert when visible is true', () => {
    render(
      <MemoryRouter>
        <ConnectionErrorBanner visible={true} />
      </MemoryRouter>
    );

    expect(screen.getByText('Unable to connect to database')).toBeInTheDocument();
    expect(screen.getByTestId('connection-error-icon')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to settings/i })).toHaveAttribute('href', '/settings');
  });
});
