import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

describe('App', () => {
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

  it('shows the level select placeholder after clicking Level Select', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    expect(screen.getByRole('heading', { name: /level select/i })).toBeInTheDocument();
    expect(screen.getByText(/placeholder level select screen/i)).toBeInTheDocument();
  });

  it('opens the settings placeholder after clicking Settings', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));

    expect(screen.getByRole('dialog', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByText(/settings placeholder/i)).toBeInTheDocument();
  });
});
