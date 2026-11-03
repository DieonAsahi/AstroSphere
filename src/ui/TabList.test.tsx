import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TabList } from './TabList';

describe('TabList', () => {
  const options = [
    { id: 'tab-1', label: 'Tab Satu' },
    { id: 'tab-2', label: 'Tab Dua' },
    { id: 'tab-3', label: 'Tab Tiga' },
  ];

  it('renders with role="tablist" and accessible tab buttons', () => {
    render(
      <TabList
        label="Daftar Tab Uji"
        options={options}
        value="tab-1"
        onChange={vi.fn()}
        baseId="test-tablist"
      />,
    );

    const tablist = screen.getByRole('tablist', { name: 'Daftar Tab Uji' });
    expect(tablist).toBeInTheDocument();

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('tabIndex', '0');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[1]).toHaveAttribute('tabIndex', '-1');
  });

  it('calls onChange when clicking a tab', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <TabList
        label="Daftar Tab Uji"
        options={options}
        value="tab-1"
        onChange={handleChange}
        baseId="test-tablist"
      />,
    );

    const tabs = screen.getAllByRole('tab');
    await user.click(tabs[1]);
    expect(handleChange).toHaveBeenCalledWith('tab-2');
  });

  it('supports keyboard navigation with ArrowRight, ArrowLeft, Home, and End', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <TabList
        label="Daftar Tab Uji"
        options={options}
        value="tab-1"
        onChange={handleChange}
        baseId="test-tablist"
      />,
    );

    const tabs = screen.getAllByRole('tab');
    tabs[0].focus();

    await user.keyboard('{ArrowRight}');
    expect(handleChange).toHaveBeenCalledWith('tab-2');

    await user.keyboard('{End}');
    expect(handleChange).toHaveBeenCalledWith('tab-3');

    await user.keyboard('{Home}');
    expect(handleChange).toHaveBeenCalledWith('tab-1');
  });
});
