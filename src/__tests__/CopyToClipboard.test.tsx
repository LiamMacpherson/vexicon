
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CopyToClipboard from '../components/CopyToClipboard';
import { getAsText } from '../utils/flagConversionUtils';

describe('CopyToClipboard', () => {
  beforeEach(() => {
    // Provide a clipboard mock if not available
    // @ts-ignore
    global.navigator.clipboard = { writeText: vi.fn() };
  });

  afterEach(() => {
    vi.resetAllMocks();
    // @ts-ignore
    delete global.navigator.clipboard;
  });

  it('copies text to the clipboard and shows feedback', () => {
    const segments = [{ type: 'text', text: 'Hello ' }, { type: 'flag', flag: '🇫🇷', original: 'France' }];
    render(<CopyToClipboard segments={segments as any} />);

    const btn = screen.getByRole('button');

    expect(btn.textContent).toContain('Copy text');

    fireEvent.click(btn);

    // Check clipboard
    // @ts-ignore
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(getAsText(segments as any));

    expect(btn.textContent).toContain('Copied!');
  });
});