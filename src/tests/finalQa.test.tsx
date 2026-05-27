import { fireEvent, render, screen, waitFor, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { LEVELS } from '../data/levels';
import { createInitialSaveData } from '../utils/progressStorage';
import { resetAppStorage } from './testStorage';
import packageJson from '../../package.json';

function progressWithUnlockedLevels(currentLevel = 1) {
  return {
    ...createInitialSaveData(),
    currentLevel,
    hasActiveRun: true,
    unlockedLevels: LEVELS.map((level) => level.id),
  };
}

async function completeFirstLevel(user = userEvent.setup()) {
  await user.click(screen.getByRole('button', { name: /new game/i }));
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  fireEvent.keyDown(window, { key: 'ArrowDown' });
  fireEvent.keyDown(window, { key: 'ArrowDown' });

  expect(screen.getByRole('status', { name: /level completed/i })).toBeInTheDocument();
}

describe('final QA', () => {
  beforeEach(() => {
    resetAppStorage();
    document.documentElement.className = '';
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('starts every level without crashing', async () => {
    const user = userEvent.setup();

    for (const level of LEVELS) {
      window.localStorage.setItem('puzzle-drift:save', JSON.stringify(progressWithUnlockedLevels(level.id)));
      render(<App />);

      await user.click(screen.getByRole('button', { name: /continue/i }));

      expect(screen.getByRole('heading', { name: `Level ${level.id}` })).toBeInTheDocument();
      expect(screen.getByRole('grid', { name: `${level.name} board` })).toBeInTheDocument();

      cleanup();
      resetAppStorage();
    }
  });

  it('persists progress after a refresh-style remount', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await completeFirstLevel(user);

    await waitFor(() => {
      const savedProgress = JSON.parse(window.localStorage.getItem('puzzle-drift:save') ?? '{}');

      expect(savedProgress.completedLevels).toContain(1);
      expect(savedProgress.unlockedLevels).toContain(2);
    });

    unmount();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Level Select' }));

    expect(screen.getByRole('button', { name: 'Level 1: First Drift' })).toHaveClass('completed');
    expect(screen.getByRole('button', { name: 'Level 2: Corner Signal' })).toBeEnabled();
  });

  it('persists settings after a refresh-style remount', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.click(screen.getByLabelText(/reduced motion/i));
    await user.selectOptions(screen.getByLabelText(/theme/i), 'ember-grid');

    await waitFor(() => {
      expect(document.documentElement).toHaveClass('reduced-motion');
      expect(document.documentElement).toHaveClass('theme-ember-grid');
    });

    unmount();
    document.documentElement.className = '';
    render(<App />);

    await waitFor(() => {
      expect(document.documentElement).toHaveClass('reduced-motion');
      expect(document.documentElement).toHaveClass('theme-ember-grid');
    });
  });

  it('retry, level select, and next level work from completion', async () => {
    const user = userEvent.setup();
    render(<App />);

    await completeFirstLevel(user);
    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(screen.queryByRole('status', { name: /level completed/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    await user.click(within(screen.getByRole('status', { name: /level completed/i })).getByRole('button', { name: /level select/i }));

    expect(screen.getByRole('heading', { name: /level select/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Level 1: First Drift' }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    await user.click(screen.getByRole('button', { name: /next level/i }));

    expect(screen.getByRole('heading', { name: 'Level 2' })).toBeInTheDocument();
  });

  it('renders accessible names for interactive controls', async () => {
    const user = userEvent.setup();
    render(<App />);

    screen.getAllByRole('button').forEach((button) => {
      expect(button).toHaveAccessibleName();
    });

    await user.click(screen.getByRole('button', { name: /level select/i }));

    screen.getAllByRole('button').forEach((button) => {
      expect(button).toHaveAccessibleName();
    });
  });

  it('does not emit console errors during common navigation', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole('button', { name: /level select/i }));
    await user.click(screen.getByRole('button', { name: 'Level 1: First Drift' }));
    await user.click(screen.getByRole('button', { name: /pause game/i }));
    await user.click(screen.getByRole('button', { name: /settings/i }));

    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('uses Lucide React for icons and no backend dependencies', () => {
    const allDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    expect(allDependencies).toHaveProperty('lucide-react');
    expect(Object.keys(allDependencies)).not.toEqual(
      expect.arrayContaining(['react-icons', '@fortawesome/react-fontawesome', '@heroicons/react']),
    );
    expect(Object.keys(allDependencies)).not.toEqual(
      expect.arrayContaining(['express', 'koa', 'fastify', 'hapi', 'nestjs', '@nestjs/core', 'mongoose', 'pg']),
    );
  });
});
