import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { resetAppStorage } from './testStorage';

describe('App', () => {
  beforeEach(() => {
    resetAppStorage();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the app', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /puzzle drift/i })).toBeInTheDocument();
  });

  it('renders the start screen buttons', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new game/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /level select/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
  });

  it('shows all level cards after clicking Level Select', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    expect(screen.getByRole('heading', { name: /level select/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /level \d+/i })).toHaveLength(30);
  });

  it('opens the settings placeholder after clicking Settings', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));

    expect(screen.getByRole('dialog', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByText(/settings placeholder/i)).toBeInTheDocument();
  });

  it('unlocks the first level by default', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    expect(screen.getByRole('button', { name: 'Level 1: First Drift' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Level 2: Corner Signal locked' })).toBeDisabled();
  });

  it('does not open locked levels', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));
    await user.click(screen.getByRole('button', { name: 'Level 2: Corner Signal locked' }));

    expect(screen.getByRole('heading', { name: /level select/i })).toBeInTheDocument();
  });

  it('opens unlocked levels', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));
    await user.click(screen.getByRole('button', { name: 'Level 1: First Drift' }));

    expect(screen.getByRole('heading', { name: /level 1/i })).toBeInTheDocument();
  });

  it('completing level 1 unlocks level 2', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    await user.click(screen.getByRole('button', { name: /complete level/i }));
    await user.click(screen.getByRole('button', { name: /back to start/i }));
    await user.click(screen.getByRole('button', { name: /level select/i }));

    expect(screen.getByRole('button', { name: 'Level 2: Corner Signal' })).toBeEnabled();
  });

  it('completing a level by reaching the exit saves progress', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });

    expect(screen.getByText(/drift cleared/i)).toBeInTheDocument();

    await waitFor(() => {
      const savedProgress = JSON.parse(window.localStorage.getItem('puzzle-drift:save') ?? '{}');

      expect(savedProgress.completedLevels).toContain(1);
      expect(savedProgress.unlockedLevels).toContain(2);
    });
  });

  it('reset restores player to the starting position and clears move count', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.getByLabelText('Player at 2, 1')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /reset level/i }));

    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('undo restores previous player position and decrements move count', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.getByLabelText('Player at 3, 1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /undo move/i }));

    expect(screen.getByLabelText('Player at 2, 1')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('pause stops timer updates', async () => {
    vi.useFakeTimers();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /new game/i }));

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText('0:02')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /pause game/i }));
    expect(screen.getByRole('dialog', { name: /paused/i })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText('0:02')).toBeInTheDocument();
  });
});
