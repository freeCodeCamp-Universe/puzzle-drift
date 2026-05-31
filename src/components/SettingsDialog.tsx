import { AlertTriangle, Music, RotateCcw, Volume2, Wand2, X } from 'lucide-react';
import { useState } from 'react';
import type { GameSettings } from '../types/game';

type SettingsDialogProps = {
  isOpen: boolean;
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
  onClose: () => void;
  onResetProgress: () => void;
};

export function SettingsDialog({
  isOpen,
  settings,
  onChange,
  onClose,
  onResetProgress,
}: SettingsDialogProps) {
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  if (!isOpen) {
    return null;
  }

  const updateSetting = <Key extends keyof GameSettings>(key: Key, value: GameSettings[Key]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="dialog-header">
          <div className="dialog-title">
            <h2 id="settings-title">Settings</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close settings">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="settings-group" aria-label="Audio settings">
          <label className="toggle-row">
            <span>
              <Volume2 aria-hidden="true" />
              Sound effects
            </span>
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(event) => updateSetting('soundEnabled', event.target.checked)}
            />
          </label>

          <label className="toggle-row">
            <span>
              <Music aria-hidden="true" />
              Music
            </span>
            <input
              type="checkbox"
              checked={settings.musicEnabled}
              onChange={(event) => updateSetting('musicEnabled', event.target.checked)}
            />
          </label>
        </div>

        <div className="settings-group" aria-label="Display settings">
          <label className="toggle-row">
            <span>
              <Wand2 aria-hidden="true" />
              Reduced motion
            </span>
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(event) => updateSetting('reducedMotion', event.target.checked)}
            />
          </label>
        </div>

        <div className="settings-danger-zone">
          <button
            type="button"
            className="menu-button danger"
            onClick={() => setIsConfirmingReset(true)}
          >
            <RotateCcw aria-hidden="true" />
            <span>Reset Progress</span>
          </button>
        </div>

        {isConfirmingReset ? (
          <div className="confirm-reset-panel" role="alertdialog" aria-modal="true" aria-labelledby="reset-title">
            <div className="dialog-title">
              <AlertTriangle aria-hidden="true" />
              <h3 id="reset-title">Reset progress?</h3>
            </div>
            <p>This clears unlocked levels, completions, stars, best moves, and best times.</p>
            <div className="confirm-actions">
              <button
                type="button"
                className="menu-button danger"
                onClick={() => {
                  onResetProgress();
                  setIsConfirmingReset(false);
                }}
              >
                <RotateCcw aria-hidden="true" />
                <span>Confirm Reset</span>
              </button>
              <button type="button" className="menu-button" onClick={() => setIsConfirmingReset(false)}>
                <X aria-hidden="true" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
