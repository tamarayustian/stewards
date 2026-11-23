import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RelativeDate } from '@/components/relative-date';

describe('RelativeDate', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the absolute date on the server instead of a server-local relative label', () => {
    // Late UTC on the 20th is already the 21st in Hong Kong and still the 20th in
    // New York: a server-local relative label would be wrong for at least one
    // viewer, so the first paint must be the absolute date.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-20T23:00:00Z'));

    const markup = renderToStaticMarkup(
      React.createElement(RelativeDate, { date: new Date('2026-11-20T00:00:00.000Z') }),
    );

    expect(markup).toContain('20 Nov 2026');
    expect(markup).not.toMatch(/Today|Tomorrow|Yesterday/);
  });
});
