import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { KeyboardHelpModal } from './KeyboardHelpModal';

describe('KeyboardHelpModal Component', () => {
  it('does not render when isOpen is false', () => {
    render(<KeyboardHelpModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders shortcut list when isOpen is true', () => {
    render(<KeyboardHelpModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Pintasan Keyboard AstroSphere' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Buka pencarian & palet perintah cepat'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Putar sudut pandang kamera (360 derajat)'),
    ).toBeInTheDocument();
  });

  it('calls onClose when close button clicked or Escape pressed', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();
    render(<KeyboardHelpModal isOpen={true} onClose={handleClose} />);

    const closeBtn = screen.getByRole('button', {
      name: 'Tutup panduan pintasan keyboard',
    });
    await user.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    handleClose.mockClear();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('passes accessibility audit with zero axe violations', async () => {
    const { container } = render(
      <KeyboardHelpModal isOpen={true} onClose={vi.fn()} />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
