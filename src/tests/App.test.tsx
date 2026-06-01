import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { LEVELS } from '../data/levels';
import { getChapterCompletionMilestone } from '../utils/chapterMilestones';
import { completeLevel, createInitialSaveData, unlockHintTier } from '../utils/progressStorage';
import { resetAppStorage } from './testStorage';

function unlockThroughLevel(levelId: number) {
  let progress = createInitialSaveData();

  for (let currentLevel = 1; currentLevel < levelId; currentLevel += 1) {
    progress = completeLevel(progress, currentLevel, {
      moves: 1,
      stars: 3,
      timeSeconds: 1,
    });
  }

  window.localStorage.setItem('puzzle-drift:save', JSON.stringify(progress));
}

async function openLevel3() {
  const user = userEvent.setup();
  unlockThroughLevel(3);
  render(<App />);

  await user.click(screen.getByRole('button', { name: /level select/i }));
  await user.click(screen.getByRole('button', { name: 'Level 3: Keyline' }));

  return user;
}

async function openLevel6() {
  const user = userEvent.setup();
  unlockThroughLevel(6);
  render(<App />);

  await user.click(screen.getByRole('button', { name: /level select/i }));
  await user.click(screen.getByRole('button', { name: 'Level 6: Switch Primer' }));

  return user;
}

async function openSpikeLane() {
  const user = userEvent.setup();
  unlockThroughLevel(11);
  render(<App />);

  await user.click(screen.getByRole('button', { name: /level select/i }));
  await user.click(screen.getByRole('button', { name: 'Level 11: Spike Lane' }));

  return user;
}

function solveFirstDrift() {
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  fireEvent.keyDown(window, { key: 'ArrowDown' });
  fireEvent.keyDown(window, { key: 'ArrowDown' });
}

function expectLevelOneCompleteLevelTwoIncomplete() {
  const levelOneCard = screen.getByRole('button', { name: 'Level 1: First Drift' });
  const levelTwoCard = screen.getByRole('button', { name: 'Level 2: Corner Signal' });

  expect(within(levelOneCard).getByText('Completed')).toBeInTheDocument();
  expect(within(levelTwoCard).getByText('Unlocked')).toBeInTheDocument();
  expect(within(levelTwoCard).queryByText('Completed')).not.toBeInTheDocument();
}

describe('App', () => {
  beforeEach(() => {
    resetAppStorage();
    document.documentElement.className = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the app', () => {
    render(<App />);

    expect(screen.getByRole('link', { name: /skip to main content/i })).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByRole('heading', { name: /puzzle drift/i })).toBeInTheDocument();
  });

  it('renders the start screen buttons', () => {
    render(<App />);

    expect(screen.queryByText(/neon logic arcade/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new game/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /level select/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /how to play/i })).toBeInTheDocument();
  });

  it('opens the how to play dialog from the start screen', async () => {
    const user = userEvent.setup();
    render(<App />);

    const howToPlayButton = screen.getByRole('button', { name: /how to play/i });
    await user.click(howToPlayButton);

    expect(screen.getByRole('dialog', { name: /how to play/i }).tagName).toBe('DIALOG');
    expect(screen.getByRole('list', { name: '' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByRole('button', { name: /close how to play/i })).toHaveFocus();

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog', { name: /how to play/i })).not.toBeInTheDocument());
    await waitFor(() => expect(howToPlayButton).toHaveFocus());
  });

  it('shows all level cards after clicking Level Select', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    expect(screen.getByRole('heading', { name: /level select/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /level \d+/i })).toHaveLength(30);
  });

  it('keeps level cards as a single streamlined tab stop', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    const firstLevelCard = screen.getByRole('button', { name: 'Level 1: First Drift' });

    expect(firstLevelCard).toBeEnabled();
    expect(firstLevelCard.querySelectorAll('button, a, [tabindex]')).toHaveLength(0);
  });

  it('does not render level preview thumbnails in level cards', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    const portalLevel = screen.getByRole('button', { name: 'Level 17: Portal Lock locked' });
    const spikeLevel = screen.getByRole('button', { name: 'Level 11: Spike Lane locked' });

    expect(within(portalLevel).queryByLabelText(/portal lock board preview/i)).not.toBeInTheDocument();
    expect(portalLevel.querySelector('.level-preview')).not.toBeInTheDocument();
    expect(within(spikeLevel).queryByLabelText(/spike lane board preview/i)).not.toBeInTheDocument();
    expect(spikeLevel.querySelector('.level-preview')).not.toBeInTheDocument();
  });

  it('groups level select cards by campaign chapter progress', async () => {
    const user = userEvent.setup();
    let progress = createInitialSaveData();

    for (let levelId = 1; levelId <= 10; levelId += 1) {
      progress = completeLevel(progress, levelId, {
        moves: levelId,
        stars: 3,
        timeSeconds: levelId,
      });
    }

    for (let levelId = 11; levelId <= 16; levelId += 1) {
      progress = completeLevel(progress, levelId, {
        moves: levelId,
        stars: 2,
        timeSeconds: levelId,
      });
    }

    for (let levelId = 21; levelId <= 22; levelId += 1) {
      progress = completeLevel(progress, levelId, {
        moves: levelId,
        stars: 1,
        timeSeconds: levelId,
      });
    }

    window.localStorage.setItem('puzzle-drift:save', JSON.stringify(progress));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    expect(screen.getByText('Chapter 1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /training grid/i })).toBeInTheDocument();
    expect(screen.getByText('10 / 10 Complete')).toBeInTheDocument();
    expect(screen.getByLabelText('10 of 10 levels complete')).toBeInTheDocument();
    expect(screen.getByText('Chapter 2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /crystal labyrinth/i })).toBeInTheDocument();
    expect(screen.getByText('6 / 10 Complete')).toBeInTheDocument();
    expect(screen.getByLabelText('6 of 10 levels complete')).toBeInTheDocument();
    expect(screen.getByText('Chapter 3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /rift core/i })).toBeInTheDocument();
    expect(screen.getByText('2 / 10 Complete')).toBeInTheDocument();
    expect(screen.getByLabelText('2 of 10 levels complete')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar', { name: /levels complete/i })).not.toBeInTheDocument();
  });

  it('shows a focused campaign summary calculated from saved progress', async () => {
    const user = userEvent.setup();
    let progress = createInitialSaveData();

    progress = completeLevel(progress, 1, {
      moves: 10,
      stars: 3,
      timeSeconds: 10,
    });
    progress = completeLevel(progress, 2, {
      moves: 12,
      stars: 2,
      timeSeconds: 20,
    });
    progress = completeLevel(progress, 3, {
      moves: 14,
      stars: 1,
      timeSeconds: 30,
    });

    window.localStorage.setItem('puzzle-drift:save', JSON.stringify(progress));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    const summary = screen.getByRole('region', { name: /campaign summary/i });

    expect(within(summary).getByText('Current Objective')).toBeInTheDocument();
    expect(within(summary).getByRole('heading', { name: /level 4 door loop/i })).toBeInTheDocument();
    expect(within(summary).getAllByRole('term')).toHaveLength(3);
    expect(within(summary).getAllByRole('definition')).toHaveLength(3);
    expect(within(summary).getByText('Levels Completed')).toBeInTheDocument();
    expect(within(summary).getByText('3 / 30')).toBeInTheDocument();
    expect(within(summary).getByText('Stars Earned')).toBeInTheDocument();
    expect(within(summary).getByText('6 / 90')).toBeInTheDocument();
    expect(within(summary).getByText('Current Chapter')).toBeInTheDocument();
    expect(within(summary).getByText('Training Grid')).toBeInTheDocument();
    expect(within(summary).queryByText('Best Completion Rate')).not.toBeInTheDocument();
    expect(within(summary).queryByText('Total Moves')).not.toBeInTheDocument();
    expect(within(summary).queryByText('Total Play Time')).not.toBeInTheDocument();

    expect(screen.queryByRole('region', { name: /star breakdown/i })).not.toBeInTheDocument();
    expect(within(summary).queryByRole('heading', { name: /star breakdown/i })).not.toBeInTheDocument();
    expect(within(summary).queryByText('Total Stars')).not.toBeInTheDocument();
    expect(within(summary).queryByText('Levels with 3 Stars')).not.toBeInTheDocument();
    expect(within(summary).queryByText('Levels with 2 Stars')).not.toBeInTheDocument();
    expect(within(summary).queryByText('Levels with 1 Star')).not.toBeInTheDocument();
    expect(within(summary).queryByText('Levels Uncompleted')).not.toBeInTheDocument();
  });

  it('shows puzzle journal history from saved progress', async () => {
    const user = userEvent.setup();
    const progress = completeLevel(createInitialSaveData(), 1, {
      doorsOpened: 2,
      hintsUsed: 1,
      keysCollected: 1,
      moves: 10,
      portalsUsed: 0,
      stars: 3,
      timeSeconds: 25,
    });

    window.localStorage.setItem('puzzle-drift:save', JSON.stringify(progress));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    const journal = screen.getByRole('region', { name: /puzzle journal/i });
    const journalToggle = within(journal).getByRole('button', { name: /puzzle journal/i });

    expect(journalToggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(journal).queryByLabelText(/first drift journal entry/i)).not.toBeInTheDocument();

    await user.click(journalToggle);

    const firstDriftEntry = within(journal).getByLabelText(/first drift journal entry/i);

    expect(journalToggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(journal).getByRole('list')).toBeInTheDocument();
    expect(within(journal).getAllByRole('listitem')).toHaveLength(30);
    expect(within(journal).getByText('Puzzle Journal')).toBeInTheDocument();
    expect(within(firstDriftEntry).getByText('First Drift')).toBeInTheDocument();
    expect(within(firstDriftEntry).getByText('Completion date')).toBeInTheDocument();
    expect(within(firstDriftEntry).getByText('10')).toBeInTheDocument();
    expect(within(firstDriftEntry).getByText('0:25')).toBeInTheDocument();
    expect(within(firstDriftEntry).getByText('3 / 3')).toBeInTheDocument();
    expect(within(firstDriftEntry).getByText('Keys 1')).toBeInTheDocument();
    expect(within(firstDriftEntry).getByText('Doors 2')).toBeInTheDocument();
    expect(within(firstDriftEntry).getByText('Portals 0')).toBeInTheDocument();
  });

  it('shows all campaign levels without filter controls', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    expect(screen.queryByRole('region', { name: /level filters/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Portals' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Level 1: First Drift' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Level 17: Portal Lock locked' })).toBeInTheDocument();
  });

  it('highlights the highest unlocked incomplete level as the current objective', async () => {
    const user = userEvent.setup();
    const progress = completeLevel(createInitialSaveData(), 1, {
      moves: 6,
      stars: 3,
      timeSeconds: 12,
    });

    window.localStorage.setItem('puzzle-drift:save', JSON.stringify({
      ...progress,
      currentLevel: 2,
      hasActiveRun: true,
    }));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    const levelCard = screen.getByRole('button', { name: 'Level 2: Corner Signal' });

    expect(levelCard).toHaveAttribute('aria-current', 'step');
    expect(levelCard).toHaveClass('current-objective');
    expect(within(levelCard).getByText(/continue adventure/i)).toBeInTheDocument();
  });

  it('highlights the most recently played incomplete level when continuing a run', async () => {
    const user = userEvent.setup();
    let progress = createInitialSaveData();

    for (let levelId = 1; levelId <= 16; levelId += 1) {
      progress = completeLevel(progress, levelId, {
        moves: levelId,
        stars: 3,
        timeSeconds: levelId,
      });
    }

    progress = {
      ...progress,
      currentLevel: 17,
      hasActiveRun: true,
    };

    window.localStorage.setItem('puzzle-drift:save', JSON.stringify(progress));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    const levelCard = screen.getByRole('button', { name: 'Level 17: Portal Lock' });

    expect(levelCard).toHaveAttribute('aria-current', 'step');
    expect(levelCard).toHaveClass('current-objective');
    expect(within(levelCard).getByText(/continue adventure/i)).toBeInTheDocument();
  });

  it('opens the settings screen after clicking Settings', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));

    expect(screen.getByRole('dialog', { name: /settings/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/sound effects/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/music/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/reduced motion/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/high contrast/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/hint nudges/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/focus mode/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm restart/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /keyboard shortcuts/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/theme/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^theme$/i)).not.toBeInTheDocument();

    const accessibilitySettings = screen.getByRole('group', { name: /accessibility/i });
    const gameplaySettings = screen.getByRole('group', { name: /gameplay/i });
    const reducedMotionToggle = within(accessibilitySettings).getByRole('checkbox', { name: /reduced motion/i });
    const hintNudgesToggle = within(gameplaySettings).getByRole('checkbox', { name: /hint nudges/i });
    const focusModeToggle = within(gameplaySettings).getByRole('checkbox', { name: /focus mode/i });

    expect(reducedMotionToggle).toHaveAccessibleDescription(/reduce animated movement/i);
    expect(hintNudgesToggle).toHaveAccessibleDescription(/show gentle hint prompts/i);
    expect(focusModeToggle).toHaveAccessibleDescription(/hide automatic puzzle assistance and nudges/i);
  });

  it('renders the settings modal without a header gear icon', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));

    const settingsDialog = screen.getByRole('dialog', { name: /settings/i });
    expect(container.querySelector('.settings-dialog .lucide-settings')).not.toBeInTheDocument();
    expect(settingsDialog.tagName).toBe('DIALOG');
    expect(within(settingsDialog).getByRole('heading', { name: /settings/i })).toBeInTheDocument();
  });

  it('reduced motion setting applies a global class', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.click(screen.getByLabelText(/reduced motion/i));

    await waitFor(() => {
      expect(document.documentElement).toHaveClass('reduced-motion');
    });
  });

  it('high contrast setting applies a global class and persists', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.click(screen.getByLabelText(/high contrast/i));

    await waitFor(() => {
      const savedSettings = JSON.parse(window.localStorage.getItem('puzzle-drift:settings') ?? '{}');

      expect(document.documentElement).toHaveClass('high-contrast');
      expect(savedSettings.highContrast).toBe(true);
    });
  });

  it('hint nudges, focus mode, and confirm restart settings persist', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.click(screen.getByLabelText(/hint nudges/i));
    await user.click(screen.getByLabelText(/focus mode/i));
    await user.click(screen.getByLabelText(/confirm restart/i));

    await waitFor(() => {
      const savedSettings = JSON.parse(window.localStorage.getItem('puzzle-drift:settings') ?? '{}');

      expect(savedSettings.hintNudgesEnabled).toBe(false);
      expect(savedSettings.focusMode).toBe(true);
      expect(savedSettings.confirmRestart).toBe(false);
    });
  });

  it('renders the keyboard shortcuts section', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.click(screen.getByRole('button', { name: /keyboard shortcuts/i }));

    expect(screen.getByText('Arrow Keys / WASD')).toBeInTheDocument();
    expect(screen.getByText('U / Backspace')).toBeInTheDocument();
    expect(screen.getByText('Spacebar / Enter')).toBeInTheDocument();
  });

  it('Escape closes settings and returns focus', async () => {
    const user = userEvent.setup();
    render(<App />);

    const settingsButton = screen.getByRole('button', { name: /settings/i });
    await user.click(settingsButton);

    const settingsDialog = screen.getByRole('dialog', { name: /settings/i });
    expect(settingsDialog).toHaveAttribute('aria-modal', 'true');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog', { name: /settings/i })).not.toBeInTheDocument());
    await waitFor(() => expect(settingsButton).toHaveFocus());
  });

  it('removes legacy theme and audio settings from persisted settings', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      'puzzle-drift:settings',
      JSON.stringify({
        confirmRestart: false,
        focusMode: false,
        highContrast: false,
        hintNudgesEnabled: false,
        musicEnabled: true,
        reducedMotion: false,
        soundEnabled: true,
        theme: 'crystal-blue',
      }),
    );
    render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.click(screen.getByLabelText(/reduced motion/i));

    await waitFor(() => {
      const savedSettings = JSON.parse(window.localStorage.getItem('puzzle-drift:settings') ?? '{}');

      expect(savedSettings.confirmRestart).toBe(false);
      expect(savedSettings.hintNudgesEnabled).toBe(false);
      expect(savedSettings.musicEnabled).toBeUndefined();
      expect(savedSettings.soundEnabled).toBeUndefined();
      expect(savedSettings.theme).toBeUndefined();
      expect(document.documentElement.className).not.toMatch(/theme-/);
    });
  });

  it('reset progress clears LocalStorage progress without clearing settings', async () => {
    const user = userEvent.setup();
    const progress = completeLevel(createInitialSaveData(), 1, {
      moves: 6,
      stars: 3,
      timeSeconds: 12,
    });

    window.localStorage.setItem('puzzle-drift:save', JSON.stringify(progress));
    window.localStorage.setItem(
      'puzzle-drift:settings',
      JSON.stringify({
        confirmRestart: false,
        focusMode: true,
        highContrast: false,
        hintNudgesEnabled: false,
        reducedMotion: true,
      }),
    );
    render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.click(screen.getByRole('button', { name: /reset progress/i }));
    expect(screen.queryByRole('alertdialog', { name: /reset all progress/i })).not.toBeInTheDocument();
    expect(screen.getByText(/reset all progress/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /confirm reset/i }));

    await waitFor(() => {
      expect(window.localStorage.getItem('puzzle-drift:save')).toBeNull();
    });

    expect(screen.getByRole('status', { name: /progress reset\. settings preserved/i })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('puzzle-drift:settings') ?? '{}')).toMatchObject({
      confirmRestart: false,
      focusMode: true,
      hintNudgesEnabled: false,
      reducedMotion: true,
    });
  });

  it('unlocks the first level by default', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    expect(screen.getByRole('button', { name: 'Level 1: First Drift' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Level 2: Corner Signal locked' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('level card status renders correctly', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    expect(within(screen.getByRole('button', { name: 'Level 1: First Drift' })).getByText('Unlocked')).toBeInTheDocument();
    expect(
      within(screen.getByRole('button', { name: 'Level 2: Corner Signal locked' })).getByText('Locked'),
    ).toBeInTheDocument();
  });

  it('completed levels show only glanceable status on level cards', async () => {
    const user = userEvent.setup();
    const progress = completeLevel(createInitialSaveData(), 1, {
      moves: 6,
      stars: 3,
      timeSeconds: 12,
    });

    window.localStorage.setItem('puzzle-drift:save', JSON.stringify(progress));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    const levelCard = screen.getByRole('button', { name: 'Level 1: First Drift' });

    expect(within(levelCard).getByText('Completed')).toBeInTheDocument();
    expect(within(levelCard).queryByTestId('level-stars')).not.toBeInTheDocument();
    expect(within(levelCard).queryByText('Best Moves')).not.toBeInTheDocument();
    expect(within(levelCard).queryByText('Best Time')).not.toBeInTheDocument();
    expect(within(levelCard).queryByLabelText('Star requirements')).not.toBeInTheDocument();
  });

  it('level cards do not show secondary personal-best statistics', async () => {
    const user = userEvent.setup();
    const progress = completeLevel(createInitialSaveData(), 1, {
      moves: 12,
      stars: 1,
      timeSeconds: 31,
    });

    window.localStorage.setItem('puzzle-drift:save', JSON.stringify(progress));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    const levelCard = screen.getByRole('button', { name: 'Level 1: First Drift' });

    expect(within(levelCard).queryByText('12 / 10')).not.toBeInTheDocument();
    expect(within(levelCard).queryByLabelText('Best Moves target missed')).not.toBeInTheDocument();
    expect(within(levelCard).queryByText('0:31 / 0:25')).not.toBeInTheDocument();
    expect(within(levelCard).queryByLabelText('Best Time target missed')).not.toBeInTheDocument();
  });

  it('level cards omit star requirements to stay scannable', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    const levelCard = screen.getByRole('button', { name: 'Level 1: First Drift' });

    expect(within(levelCard).queryByLabelText('Star requirements')).not.toBeInTheDocument();
    expect(within(levelCard).queryByText('<= 10 moves')).not.toBeInTheDocument();
  });

  it('level card stars do not add nested hover targets', async () => {
    const user = userEvent.setup();
    const progress = completeLevel(createInitialSaveData(), 1, {
      moves: 6,
      stars: 3,
      timeSeconds: 12,
    });

    window.localStorage.setItem('puzzle-drift:save', JSON.stringify(progress));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    const levelCard = screen.getByRole('button', { name: 'Level 1: First Drift' });

    expect(levelCard.querySelectorAll('.star-tooltip-trigger')).toHaveLength(0);
  });

  it('completed level cards omit achievement badges to reduce visual clutter', async () => {
    const user = userEvent.setup();
    const progress = completeLevel(createInitialSaveData(), 1, {
      firstTryClear: true,
      moves: 10,
      stars: 3,
      timeSeconds: 25,
    });

    window.localStorage.setItem('puzzle-drift:save', JSON.stringify(progress));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    const levelCard = screen.getByRole('button', { name: 'Level 1: First Drift' });

    expect(within(levelCard).queryByText('Perfect Route')).not.toBeInTheDocument();
    expect(within(levelCard).queryByText('Speed Solver')).not.toBeInTheDocument();
    expect(within(levelCard).queryByText('Three Star Clear')).not.toBeInTheDocument();
    expect(within(levelCard).queryByText('First Try Clear')).not.toBeInTheDocument();
    expect(levelCard).not.toHaveAccessibleDescription();
  });

  it('locked levels show a lock icon', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    expect(
      within(screen.getByRole('button', { name: 'Level 2: Corner Signal locked' })).getByLabelText('Locked'),
    ).toBeInTheDocument();
  });

  it('locked levels remain focusable and show unlock context without solution stats', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    const lockedLevel = screen.getByRole('button', { name: 'Level 15: Needle Ice locked' });

    lockedLevel.focus();

    expect(lockedLevel).toHaveFocus();
    expect(lockedLevel).toHaveAttribute('aria-disabled', 'true');
    expect(within(lockedLevel).getByText('Complete Level 14 to unlock')).toBeInTheDocument();
    expect(within(lockedLevel).queryByText('Crystal Labyrinth')).not.toBeInTheDocument();
    expect(within(lockedLevel).queryByText('Ice')).not.toBeInTheDocument();
    expect(within(lockedLevel).queryByLabelText('Star requirements')).not.toBeInTheDocument();
    expect(within(lockedLevel).queryByText('<= 10 moves')).not.toBeInTheDocument();
    expect(within(lockedLevel).queryByText('<= 45 seconds', { exact: false })).not.toBeInTheDocument();
    expect(within(lockedLevel).queryByTestId('level-stars')).not.toBeInTheDocument();
    expect(lockedLevel.querySelector('.level-card-stats')).not.toBeInTheDocument();
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

  it('clicking directional buttons moves the player', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.click(screen.getByRole('button', { name: /move right/i, hidden: true }));

    expect(screen.getByLabelText('Player at 2, 1')).toBeInTheDocument();
    expect(screen.getByLabelText('1 moves')).toBeInTheDocument();
  });

  it('supports arrow and WASD keyboard movement during gameplay', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    expect(screen.getAllByRole('row')).toHaveLength(7);
    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByLabelText('Player at 2, 1')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'd' });
    expect(screen.getByLabelText('Player at 3, 1')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'a' });
    expect(screen.getByLabelText('Player at 2, 1')).toBeInTheDocument();
  });

  it('supports gameplay shortcuts for restart, undo, pause, and hints', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'u' });
    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'r' });
    expect(screen.getByRole('alertdialog', { name: /restart level/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toHaveFocus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('alertdialog', { name: /restart level/i })).not.toBeInTheDocument());
    fireEvent.keyDown(window, { key: 'r' });
    await user.click(screen.getByRole('button', { name: /confirm restart/i }));
    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();
    expect(screen.getByLabelText('0 moves')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'h' });
    expect(screen.getByRole('region', { name: /puzzle assist/i })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'h' });
    expect(screen.queryByRole('region', { name: /puzzle assist/i })).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'p' });
    expect(screen.getByRole('dialog', { name: /paused/i })).toBeInTheDocument();
  });

  it('uses Escape as gameplay pause and pause resume', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: /paused/i })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: /paused/i })).not.toBeInTheDocument();
  });

  it('HUD remains visible during gameplay', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.click(screen.getByRole('button', { name: /move right/i, hidden: true }));

    expect(screen.getByLabelText('Game heads-up display')).toBeInTheDocument();
    expect(screen.getByLabelText('Game status')).toBeInTheDocument();
    expect(screen.getByLabelText('Game controls')).toBeInTheDocument();
  });

  it('renders a hint button in the HUD', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));

    expect(screen.getByRole('button', { name: /open puzzle assist/i })).toBeInTheDocument();
  });

  it('opens a hint journal from the HUD with saved unlocked hints', async () => {
    const user = userEvent.setup();
    const progress = unlockHintTier(createInitialSaveData(), 1, 1);

    window.localStorage.setItem('puzzle-drift:save', JSON.stringify({ ...progress, hasActiveRun: true }));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /open hint journal/i }));

    const journal = screen.getByRole('region', { name: /hint journal/i });

    expect(within(journal).getByRole('heading', { name: LEVELS[0].name })).toBeInTheDocument();
    expect(within(journal).getByText(LEVELS[0].hints[0].text)).toBeInTheDocument();
    expect(within(journal).getAllByText(/keep exploring to unlock this hint/i)).toHaveLength(2);
  });

  it('opens the hint journal from the pause menu and completion screen', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    await user.click(screen.getByRole('button', { name: /pause game/i }));
    await user.click(within(screen.getByRole('dialog', { name: /paused/i })).getByRole('button', { name: /hint journal/i }));

    expect(within(screen.getByRole('dialog', { name: /paused/i })).getByRole('region', { name: /hint journal/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /resume/i }));

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    const completion = screen.getByRole('dialog', { name: /level complete/i });

    await user.click(within(completion).getByText(/^hint journal$/i, { selector: 'summary' }));
    await user.click(within(completion).getByRole('button', { name: /^hint journal$/i }));

    expect(within(completion).getByRole('region', { name: /hint journal/i })).toBeInTheDocument();
  });

  it('records local hint analytics and shows the debug report', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    await user.click(screen.getByRole('button', { name: /open puzzle assist/i }));
    await user.click(screen.getByRole('button', { name: /tier 1 direction/i }));

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });

    const analytics = JSON.parse(window.localStorage.getItem('puzzle-drift:hint-analytics') ?? '{}');

    expect(analytics.levels['1']).toMatchObject({
      attempts: 1,
      attemptsWithHint: 1,
      completionsAfterHint: 1,
      hintOpens: 1,
      tierUses: { 1: 1 },
    });

    const completion = screen.getByRole('dialog', { name: /level complete/i });

    expect(within(completion).getByText(/developer tools/i, { selector: 'summary' })).toBeInTheDocument();
    await user.click(within(completion).getByText(/developer tools/i, { selector: 'summary' }));
    await user.click(within(completion).getByRole('button', { name: /hint analytics/i }));

    const report = within(completion).getByRole('region', {
      name: /hint analytics report/i,
    });

    expect(within(report).getByText(`Level 1: ${LEVELS[0].name}`)).toBeInTheDocument();
    expect(within(report).getAllByText('100%')).toHaveLength(2);
  });

  it('lets players choose a hint tier before showing help text', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    await user.click(screen.getByRole('button', { name: /open puzzle assist/i }));

    expect(screen.getByRole('region', { name: /puzzle assist/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tier 1 direction/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tier 2 mechanic/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tier 3 route/i })).toBeInTheDocument();
    expect(screen.queryByText(LEVELS[0].hints[0].text)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /tier 1 direction/i }));

    expect(screen.getByText(LEVELS[0].hints[0].text)).toBeInTheDocument();
    expect(screen.getByRole('status', { name: new RegExp(LEVELS[0].hints[0].text, 'i') })).toHaveAttribute(
      'aria-atomic',
      'true',
    );
  });

  it('announces visual hint highlights politely', async () => {
    const user = await openLevel3();

    await user.click(screen.getByRole('button', { name: /open puzzle assist/i }));
    await user.click(screen.getByRole('button', { name: /show visual hint/i }));

    expect(screen.getByRole('status', { name: /related puzzle objects highlighted/i })).toHaveAttribute(
      'aria-live',
      'polite',
    );
  });

  it('proactively shows a contextual assist nudge when the player appears stuck', async () => {
    vi.useFakeTimers();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /new game/i }));

    act(() => {
      vi.advanceTimersByTime(35000);
    });

    expect(screen.getByRole('complementary', { name: /puzzle assist nudge/i })).toBeInTheDocument();
    expect(screen.getByText(/need a nudge/i)).toBeInTheDocument();
    expect(screen.getByText(/read the board/i)).toBeInTheDocument();
    expect(screen.queryByText(LEVELS[0].hints[0].text)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /view hint/i }));

    expect(screen.getByRole('region', { name: /puzzle assist/i })).toBeInTheDocument();
  });

  it('does not show contextual assist nudges when disabled', async () => {
    window.localStorage.setItem(
      'puzzle-drift:settings',
      JSON.stringify({
        confirmRestart: true,
        focusMode: false,
        highContrast: false,
        hintNudgesEnabled: false,
        reducedMotion: false,
      }),
    );
    vi.useFakeTimers();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /new game/i }));

    act(() => {
      vi.advanceTimersByTime(35000);
    });

    expect(screen.queryByRole('complementary', { name: /puzzle assist nudge/i })).not.toBeInTheDocument();
  });

  it('focus mode suppresses automatic nudges while keeping manual puzzle assist available', async () => {
    window.localStorage.setItem(
      'puzzle-drift:settings',
      JSON.stringify({
        confirmRestart: true,
        focusMode: true,
        highContrast: false,
        hintNudgesEnabled: true,
        reducedMotion: false,
      }),
    );
    vi.useFakeTimers();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /new game/i }));

    act(() => {
      vi.advanceTimersByTime(35000);
    });

    expect(screen.queryByRole('complementary', { name: /puzzle assist nudge/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /open puzzle assist/i }));

    expect(screen.getByRole('region', { name: /puzzle assist/i })).toBeInTheDocument();
  });

  it('detects repeated movement loops before offering puzzle assist', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.getByRole('complementary', { name: /puzzle assist nudge/i })).toBeInTheDocument();
    expect(screen.getByText(/circling the same few tiles/i)).toBeInTheDocument();
  });

  it('detects repeated spike deaths before offering puzzle assist', async () => {
    const user = await openSpikeLane();

    for (let deathCount = 0; deathCount < 3; deathCount += 1) {
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      await user.click(screen.getByRole('button', { name: /retry the level/i }));
    }

    expect(screen.getByRole('complementary', { name: /puzzle assist nudge/i })).toBeInTheDocument();
    expect(screen.getByText(/running into hazards/i)).toBeInTheDocument();
  });

  it('detects an unused portal on portal lessons before offering puzzle assist', async () => {
    let progress = createInitialSaveData();

    for (let currentLevel = 1; currentLevel < 16; currentLevel += 1) {
      progress = completeLevel(progress, currentLevel, {
        moves: 1,
        stars: 3,
        timeSeconds: 1,
      });
    }

    window.localStorage.setItem(
      'puzzle-drift:save',
      JSON.stringify({
        ...progress,
        currentLevel: 16,
        hasActiveRun: true,
      }),
    );
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    act(() => {
      vi.advanceTimersByTime(90000);
    });

    expect(screen.getByRole('complementary', { name: /puzzle assist nudge/i })).toBeInTheDocument();
    expect(screen.getByText(/portal may be more important/i)).toBeInTheDocument();
  });

  it('reveals mechanic and route tiers on demand', async () => {
    vi.useFakeTimers();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.click(screen.getByRole('button', { name: /open puzzle assist/i }));

    expect(screen.getByRole('button', { name: /tier 2 mechanic/i })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    fireEvent.click(screen.getByRole('button', { name: /tier 2 mechanic/i }));
    expect(screen.getByText(LEVELS[0].hints[1].text)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /tier 3 route/i })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    fireEvent.click(screen.getByRole('button', { name: /tier 3 route/i }));
    expect(screen.getByText(LEVELS[0].hints[2].text)).toBeInTheDocument();
  });

  it('shows level-specific hints', async () => {
    const user = userEvent.setup();
    const progress = completeLevel(createInitialSaveData(), 1, {
      moves: 6,
      stars: 3,
      timeSeconds: 12,
    });

    window.localStorage.setItem('puzzle-drift:save', JSON.stringify(progress));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));
    await user.click(screen.getByRole('button', { name: 'Level 2: Corner Signal' }));
    await user.click(screen.getByRole('button', { name: /open puzzle assist/i }));
    await user.click(screen.getByRole('button', { name: /tier 1 direction/i }));

    expect(screen.getByText(LEVELS[1].hints[0].text)).toBeInTheDocument();
    expect(screen.queryByText(LEVELS[0].hints[0].text)).not.toBeInTheDocument();
  });

  it('completing level 1 unlocks level 2', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    await user.click(within(screen.getByRole('dialog', { name: /level complete/i })).getByRole('button', { name: /^level select$/i }));

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

    expect(screen.getByRole('heading', { name: /level complete/i })).toBeInTheDocument();

    await waitFor(() => {
      const savedProgress = JSON.parse(window.localStorage.getItem('puzzle-drift:save') ?? '{}');

      expect(savedProgress.completedLevels).toContain(1);
      expect(savedProgress.unlockedLevels).toContain(2);
    });
  });

  it('shows completion scoring and actions after clearing a level', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    solveFirstDrift();

    const completion = screen.getByRole('dialog', { name: /level complete/i });

    expect(within(completion).getByRole('heading', { name: /level complete/i })).toBeInTheDocument();
    expect(within(completion).getAllByText('Time').length).toBeGreaterThan(0);
    expect(within(completion).getAllByText('Moves').length).toBeGreaterThan(0);
    expect(within(completion).getAllByLabelText(/3 stars earned/i).length).toBeGreaterThan(0);
    expect(within(completion).queryByText('Stars')).not.toBeInTheDocument();
    const nextButton = within(completion).getByRole('button', { name: /^next level$/i });
    const retryButton = within(completion).getByRole('button', { name: /^retry$/i });
    const levelSelectButton = within(completion).getByRole('button', { name: /^level select$/i });
    const actionArea = completion.querySelector('.completion-primary-actions');

    expect(actionArea).not.toBeNull();
    expect(within(actionArea as HTMLElement).getAllByRole('button')).toHaveLength(3);
    expect(within(actionArea as HTMLElement).queryByRole('button', { name: /hint analytics/i })).not.toBeInTheDocument();
    expect(nextButton).toHaveFocus();
    expect(nextButton).toHaveClass('completion-action');
    expect(nextButton.querySelector('.action-label')).toHaveTextContent('Next Level');
    expect(nextButton.querySelector('.action-shortcut')).toHaveTextContent('Press Space');
    expect(nextButton).toHaveAccessibleName('Next Level');
    expect(retryButton).toHaveClass('completion-action');
    expect(retryButton.querySelector('.action-label')).toHaveTextContent('Retry');
    expect(retryButton.querySelector('.action-shortcut')).toHaveTextContent('Press R');
    expect(retryButton).toHaveAccessibleName('Retry');
    expect(levelSelectButton).toHaveClass('completion-action');
    expect(levelSelectButton).toHaveClass('shortcut-action');
    expect(levelSelectButton.querySelector('.action-shortcut')).toHaveTextContent('Press L');
    expect(levelSelectButton).toHaveAccessibleName('Level Select');
    expect(within(completion).getByText(/performance details/i)).toBeInTheDocument();
    expect(within(completion).getByText(/performance details/i).closest('details')).not.toHaveAttribute('open');
    await user.click(within(completion).getByText(/performance details/i));
    expect(within(completion).getByText(/Perfect run/i)).toBeInTheDocument();
    expect(within(completion).getByText(/Met move target and time target/i)).toBeInTheDocument();
    expect(within(completion).getByRole('region', { name: /detailed target analysis/i })).toBeInTheDocument();
    expect(within(completion).getByRole('progressbar', { name: /moves target met/i })).toHaveAttribute('aria-valuenow', '100');
    expect(within(completion).getByRole('progressbar', { name: /time target met/i })).toHaveAttribute('aria-valuenow', '100');
    expect(within(completion).getByText('Personal Best')).toBeInTheDocument();
    expect(within(completion).getByText('Best Moves')).toBeInTheDocument();
    expect(within(completion).getByText('Best Time')).toBeInTheDocument();
    expect(within(completion).getByLabelText('Best Moves target met')).toBeInTheDocument();
    expect(within(completion).getByLabelText('Best Time target met')).toBeInTheDocument();
    expect(within(completion).getByText(/Replay to polish the route or chase speed/i)).toBeInTheDocument();
    expect(within(completion).getAllByText('New Record').length).toBeGreaterThan(0);
    expect(screen.queryByRole('grid', { name: /first drift board/i })).not.toBeInTheDocument();
    expect(document.querySelector('.game-board-shell')).toHaveAttribute('inert');
    expect(document.querySelector('.game-board-shell')).toHaveAttribute('aria-hidden', 'true');
  });

  it('completion stars explain star requirements on keyboard focus', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    solveFirstDrift();

    const completion = screen.getByRole('dialog', { name: /level complete/i });
    const oneStarTrigger = within(completion).getAllByLabelText(/1 Star: Complete the level/i)[0];

    act(() => {
      oneStarTrigger.focus();
    });

    expect(await screen.findByRole('tooltip', { name: /1 Star\s+Complete the level/i })).toBeInTheDocument();
  });

  it('explains when move count blocks higher star ratings', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    solveFirstDrift();

    const completion = screen.getByRole('dialog', { name: /level complete/i });

    expect(within(completion).getAllByText('12').length).toBeGreaterThan(0);
    expect(within(completion).getByText(/performance details/i).closest('details')).not.toHaveAttribute('open');
    await user.click(within(completion).getByText(/performance details/i));
    expect(within(completion).getByText('Level completed.', { selector: '.performance-summary-heading' })).toBeInTheDocument();
    expect(within(completion).getByText(/Exceeded move target by 2 moves/i)).toBeInTheDocument();
    expect(within(completion).getByRole('progressbar', { name: /moves target missed/i })).toHaveAttribute('aria-valuenow', '83');
    expect(within(completion).getByLabelText('Best Moves target missed')).toBeInTheDocument();
    expect(within(completion).getByLabelText('Best Time target met')).toBeInTheDocument();
    expect(within(completion).getByText(/Replay to bring your personal best under the remaining target/i)).toBeInTheDocument();
  });

  it('explains when time blocks the third star', () => {
    vi.useFakeTimers();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /new game/i }));

    act(() => {
      vi.advanceTimersByTime(31000);
    });

    solveFirstDrift();

    const completion = screen.getByRole('dialog', { name: /level complete/i });

    expect(within(completion).getAllByText('0:31').length).toBeGreaterThan(0);
    expect(within(completion).getByText(/performance details/i).closest('details')).not.toHaveAttribute('open');
    fireEvent.click(within(completion).getByText(/performance details/i));
    expect(within(completion).getByText(/Move target achieved/i)).toBeInTheDocument();
    expect(within(completion).getByText(/Missed time target by 6 seconds/i)).toBeInTheDocument();
    expect(within(completion).getByRole('progressbar', { name: /time target missed/i })).toHaveAttribute('aria-valuenow', '81');
  });

  it('celebrates near misses when a star threshold is barely missed', () => {
    vi.useFakeTimers();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /new game/i }));

    act(() => {
      vi.advanceTimersByTime(27000);
    });

    solveFirstDrift();

    const completion = screen.getByRole('dialog', { name: /level complete/i });

    fireEvent.click(within(completion).getByText(/performance details/i));
    expect(within(completion).getByText(/So close/i)).toBeInTheDocument();
    expect(within(completion).getByText(/Missed time target by 2 seconds/i)).toBeInTheDocument();
    expect(within(completion).getByText(/Replay for the third star/i)).toBeInTheDocument();
  });

  it('defines chapter completion milestones for campaign gates', () => {
    expect(getChapterCompletionMilestone(10)).toEqual({
      chapterTitle: 'Training Grid',
      nextMessage: 'Crystal Labyrinth unlocked.',
    });
    expect(getChapterCompletionMilestone(20)).toEqual({
      chapterTitle: 'Crystal Labyrinth',
      nextMessage: 'Rift Core unlocked.',
    });
    expect(getChapterCompletionMilestone(30)).toEqual({
      chapterTitle: 'Rift Core',
      nextMessage: 'Campaign complete.',
    });
    expect(getChapterCompletionMilestone(9)).toBeNull();
  });

  it('completing level 1 does not complete level 2 after advancing and leaving immediately', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    solveFirstDrift();
    await user.click(screen.getByRole('button', { name: /next level/i }));

    expect(screen.getByRole('heading', { name: /level 2/i })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: /level completed|chapter completed/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /open level select/i }));

    expectLevelOneCompleteLevelTwoIncomplete();
  });

  it('navigating away from an incomplete level does not mark it complete', async () => {
    const user = userEvent.setup();
    const progress = completeLevel(createInitialSaveData(), 1, {
      moves: 6,
      stars: 3,
      timeSeconds: 12,
    });

    window.localStorage.setItem('puzzle-drift:save', JSON.stringify({
      ...progress,
      currentLevel: 2,
      hasActiveRun: true,
    }));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByRole('heading', { name: /level 2/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back to start/i }));
    await user.click(screen.getByRole('button', { name: /level select/i }));

    expectLevelOneCompleteLevelTwoIncomplete();
  });

  it('pressing Level Select from pause does not mark the current level complete', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    solveFirstDrift();
    await user.click(screen.getByRole('button', { name: /next level/i }));
    fireEvent.keyDown(window, { key: 'p' });

    await user.click(within(screen.getByRole('dialog', { name: /paused/i })).getByRole('button', { name: /level select/i }));

    expectLevelOneCompleteLevelTwoIncomplete();
  });

  it('reset progress clears completed data and preserves only level 1 unlock', async () => {
    const user = userEvent.setup();
    const progress = completeLevel(completeLevel(createInitialSaveData(), 1, {
      moves: 6,
      stars: 3,
      timeSeconds: 12,
    }), 2, {
      moves: 8,
      stars: 2,
      timeSeconds: 20,
    });

    window.localStorage.setItem('puzzle-drift:save', JSON.stringify(progress));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.click(screen.getByRole('button', { name: /reset progress/i }));
    await user.click(screen.getByRole('button', { name: /confirm reset/i }));
    await user.click(screen.getByRole('button', { name: /level select/i }));

    const levelOneCard = screen.getByRole('button', { name: 'Level 1: First Drift' });
    const levelTwoCard = screen.getByRole('button', { name: 'Level 2: Corner Signal locked' });

    expect(within(levelOneCard).getByText('Unlocked')).toBeInTheDocument();
    expect(within(levelOneCard).queryByText('Completed')).not.toBeInTheDocument();
    expect(levelTwoCard).toHaveAttribute('aria-disabled', 'true');
    expect(within(levelTwoCard).queryByText('Completed')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('puzzle-drift:save')).toBeNull();
  });

  it('completion overlay shortcuts advance and retry while level select stays keyboard reachable', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    solveFirstDrift();
    fireEvent.keyDown(window, { key: ' ' });
    expect(screen.getByRole('heading', { name: /level 2/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back to start/i }));
    await user.click(screen.getByRole('button', { name: /new game/i }));
    solveFirstDrift();
    fireEvent.keyDown(window, { key: 'r' });
    expect(screen.queryByRole('heading', { name: /level complete/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();

    solveFirstDrift();
    expect(screen.getByRole('dialog', { name: /level complete/i })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'l' });
    expect(screen.getByRole('heading', { name: /level select/i })).toBeInTheDocument();
  });

  it('Enter advances from the completion overlay', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    solveFirstDrift();
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(screen.getByRole('heading', { name: /level 2/i })).toBeInTheDocument();
  });

  it('completion message is accessible', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    solveFirstDrift();

    expect(screen.getByRole('dialog', { name: /level complete/i })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('status', { name: /level completed.*stars earned/i })).toBeInTheDocument();
    expect(screen.getByText(/level completed with .* stars/i)).toBeInTheDocument();
  });

  it('reset restores player to the starting position and clears move count', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.getByLabelText('Player at 2, 1')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /reset level/i }));
    await user.click(screen.getByRole('button', { name: /confirm restart/i }));

    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();
    expect(screen.getByLabelText('0 moves')).toBeInTheDocument();
  });

  it('restarts immediately when confirm restart is disabled', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      'puzzle-drift:settings',
      JSON.stringify({
        confirmRestart: false,
        focusMode: false,
        highContrast: false,
        hintNudgesEnabled: true,
        reducedMotion: false,
      }),
    );
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await user.click(screen.getByRole('button', { name: /reset level/i }));

    expect(screen.queryByRole('alertdialog', { name: /restart level/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();
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

  it('pause modal blocks gameplay and restores focus when closed', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    const pauseButton = screen.getByRole('button', { name: /pause game/i });

    await user.click(pauseButton);

    const pauseDialog = screen.getByRole('dialog', { name: /paused/i });
    const backdrop = pauseDialog.closest('.dialog-backdrop');

    expect(pauseDialog).toHaveAttribute('aria-modal', 'true');
    expect(backdrop).toHaveClass('pause-backdrop');
    expect(screen.queryByRole('grid', { name: /first drift board/i })).not.toBeInTheDocument();
    expect(document.querySelector('.game-play-area')).toHaveAttribute('inert');
    expect(document.querySelector('.game-play-area')).toHaveAttribute('aria-hidden', 'true');
    expect(document.querySelector('.game-screen')).toHaveClass('paused');

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.queryByRole('button', { name: /move right/i })).not.toBeInTheDocument();

    await user.hover(pauseButton);
    expect(screen.queryByRole('tooltip', { name: /pause game/i })).not.toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /paused/i })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('grid', { name: /first drift board/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();
    await waitFor(() => expect(pauseButton).toHaveFocus());
  });

  it('pause modal shortcuts resume and restart while level select stays keyboard reachable', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'p' });

    expect(screen.getByRole('button', { name: /resume.*spacebar/i })).toHaveFocus();
    expect(screen.getByText('Arrow Keys / WASD')).toBeInTheDocument();
    expect(screen.getByText('Undo: U or Backspace')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'r' });
    expect(screen.getByRole('alertdialog', { name: /restart level/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /confirm restart/i }));
    expect(screen.queryByRole('dialog', { name: /paused/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'p' });
    await user.click(screen.getByRole('button', { name: /^level select$/i }));
    expect(screen.getByRole('heading', { name: /level select/i })).toBeInTheDocument();
  });

  it('Spacebar and Enter resume from the pause modal', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'p' });
    const resumeButton = screen.getByRole('button', { name: /resume.*spacebar/i });
    const restartButton = screen.getByRole('button', { name: /restart level.*r/i });
    const levelSelectButton = screen.getByRole('button', { name: /^level select$/i });

    expect(resumeButton).toHaveClass('shortcut-action');
    expect(resumeButton.querySelector('.action-label')).toHaveTextContent('Resume');
    expect(resumeButton.querySelector('.action-shortcut')).toHaveTextContent('Spacebar');
    expect(restartButton).toHaveClass('shortcut-action');
    expect(levelSelectButton).not.toHaveClass('shortcut-action');
    expect(levelSelectButton.querySelector('.action-shortcut')).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: ' ' });
    expect(screen.queryByRole('dialog', { name: /paused/i })).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'p' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.queryByRole('dialog', { name: /paused/i })).not.toBeInTheDocument();
  });

  it('does not run gameplay shortcuts from focused buttons or open settings', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    const resetButton = screen.getByRole('button', { name: /reset level/i });
    act(() => {
      resetButton.focus();
      fireEvent.keyDown(resetButton, { key: 'r' });
    });
    expect(screen.getByLabelText('Player at 2, 1')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'p' });
    await user.click(screen.getByRole('button', { name: /settings/i }));
    fireEvent.keyDown(window, { key: 'r' });

    expect(screen.getByRole('dialog', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /settings/i })).toHaveAttribute('aria-modal', 'true');
    expect(document.querySelector('.pause-dialog')).not.toHaveAttribute('aria-modal');
  });

  it('suppresses gameplay shortcuts inside editable targets and with modifier keys', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'ArrowRight', ctrlKey: true });
    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();

    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');
    document.body.appendChild(editor);

    act(() => {
      editor.focus();
      fireEvent.keyDown(editor, { key: 'ArrowRight' });
      fireEvent.keyDown(editor, { key: 'r' });
    });

    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog', { name: /restart level/i })).not.toBeInTheDocument();

    editor.remove();
  });

  it('prevents page scroll when Spacebar is used as a shortcut', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'p' });

    const spaceEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: ' ',
    });
    const preventDefaultSpy = vi.spyOn(spaceEvent, 'preventDefault');

    act(() => {
      window.dispatchEvent(spaceEvent);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('collecting a key increases key count and removes the key tile', async () => {
    await openLevel3();

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.getByLabelText('1 keys')).toBeInTheDocument();
    expect(screen.getByLabelText('Floor at 3, 1')).toBeInTheDocument();
  });

  it('a door blocks player without a key', async () => {
    await openLevel3();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.getByLabelText('Player at 2, 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Locked door at 3, 3')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /locked\. find a key/i })).toBeInTheDocument();
  });

  it('a linked door shows switch guidance before it is opened', async () => {
    await openLevel6();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.getByLabelText('Player at 5, 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Locked door at 6, 1')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /door closed\. use the switch/i })).toBeInTheDocument();
  });

  it('opens a door with a key, consumes the key, and undo restores the door state', async () => {
    const user = await openLevel3();

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.getByLabelText('Player at 3, 3')).toBeInTheDocument();
    expect(screen.getByLabelText('0 keys')).toBeInTheDocument();
    expect(screen.getByLabelText('Opened door at 3, 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /undo move/i }));

    expect(screen.getByLabelText('Player at 2, 3')).toBeInTheDocument();
    expect(screen.getByLabelText('1 keys')).toBeInTheDocument();
    expect(screen.getByLabelText('Locked door at 3, 3')).toBeInTheDocument();
  });

  it('reset restores the original key and door layout', async () => {
    const user = await openLevel3();

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    await user.click(screen.getByRole('button', { name: /reset level/i }));
    await user.click(screen.getByRole('button', { name: /confirm restart/i }));

    expect(screen.getByLabelText('Player at 1, 3')).toBeInTheDocument();
    expect(screen.getByLabelText('0 keys')).toBeInTheDocument();
    expect(screen.getByLabelText('Collectible key at 3, 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Locked door at 3, 3')).toBeInTheDocument();
  });

  it('stepping on a spike shows a failed attempt overlay until retry', async () => {
    const user = await openSpikeLane();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.getByRole('alertdialog', { name: /hazard hit/i })).toBeInTheDocument();
    expect(screen.getByText(/you hit the spikes/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Player at 3, 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry the level/i })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: /retry the level/i }));

    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();
    expect(screen.getByLabelText('0 moves')).toBeInTheDocument();
  });

  it('stepping on a spike does not complete the level', async () => {
    await openSpikeLane();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.queryByRole('heading', { name: /level complete/i })).not.toBeInTheDocument();
  });

  it('spike failure does not save progress or unlock the next level', async () => {
    await openSpikeLane();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    const savedProgress = JSON.parse(window.localStorage.getItem('puzzle-drift:save') ?? '{}');

    expect(savedProgress.completedLevels).not.toContain(11);
    expect(savedProgress.unlockedLevels).not.toContain(12);
  });

  it('undo history clears after retrying a spike failure', async () => {
    const user = await openSpikeLane();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    await user.click(screen.getByRole('button', { name: /retry the level/i }));

    await user.click(screen.getByRole('button', { name: /undo move/i }));

    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();
    expect(screen.getByLabelText('0 moves')).toBeInTheDocument();
  });

  it('shows hazard animation after spike unless reduced motion is enabled', async () => {
    await openSpikeLane();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.getByTestId('game-board-shell')).toHaveClass('hazard-flash');
  });

  it('reduced motion disables hazard animation class', async () => {
    window.localStorage.setItem(
      'puzzle-drift:settings',
      JSON.stringify({
        highContrast: false,
        focusMode: false,
        reducedMotion: true,
      }),
    );

    await openSpikeLane();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.getByTestId('game-board-shell')).not.toHaveClass('hazard-flash');
    expect(screen.getByRole('alertdialog', { name: /hazard hit/i })).toBeInTheDocument();
    expect(screen.getByRole('alertdialog', { name: /hazard hit/i })).not.toHaveClass('hazard-failure-pop');
  });

  it('reduced motion disables completion animation classes', async () => {
    const user = userEvent.setup();

    window.localStorage.setItem(
      'puzzle-drift:settings',
      JSON.stringify({
        highContrast: false,
        focusMode: false,
        reducedMotion: true,
      }),
    );
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });

    expect(screen.getByLabelText('3 stars earned', { exact: true })).not.toHaveClass('star-reveal');
  });

  it('reduced motion prevents movement animation classes', async () => {
    const user = userEvent.setup();

    window.localStorage.setItem(
      'puzzle-drift:settings',
      JSON.stringify({
        highContrast: false,
        focusMode: false,
        reducedMotion: true,
      }),
    );
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    await user.click(screen.getByRole('button', { name: /move right/i }));

    expect(screen.getByTestId('game-board-shell')).not.toHaveClass('player-move');
    expect(screen.getByTestId('player-avatar')).not.toHaveClass('player-moving');
  });
});
