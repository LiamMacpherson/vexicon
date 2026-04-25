import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ModeToggle from '../components/ModeToggle';

describe('ModeToggle', () => {
  it('renders three buttons and calls onChange with correct mode', () => {
    const onChange = vi.fn();
    render(<ModeToggle mode="daily" onChange={onChange} />);

    const encode = screen.getByText('✏️ Encode');
    const daily = screen.getByText('📅 Daily');
    const practice = screen.getByText('🎮 Practice');

    expect(encode).toBeTruthy();
    expect(daily).toBeTruthy();
    expect(practice).toBeTruthy();

    fireEvent.click(encode);
    expect(onChange).toHaveBeenLastCalledWith('encode');

    fireEvent.click(practice);
    expect(onChange).toHaveBeenLastCalledWith('practice');
  });
});