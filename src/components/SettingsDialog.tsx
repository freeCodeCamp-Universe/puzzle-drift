import { Settings, Volume2, Wand2, X } from 'lucide-react';
import type { GameSettings } from '../types/game';

type SettingsDialogProps = {
  isOpen: boolean;
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
  onClose: () => void;
};

export function SettingsDialog({ isOpen, settings, onChange, onClose }: SettingsDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="dialog-header">
          <div className="dialog-title">
            <Settings aria-hidden="true" />
            <h2 id="settings-title">Settings</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close settings">
            <X aria-hidden="true" />
          </button>
        </header>

        <p className="placeholder-copy">Settings placeholder</p>

        <label className="toggle-row">
          <span>
            <Volume2 aria-hidden="true" />
            Sound
          </span>
          <input
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={(event) => onChange({ ...settings, soundEnabled: event.target.checked })}
          />
        </label>

        <label className="toggle-row">
          <span>
            <Wand2 aria-hidden="true" />
            Reduced motion
          </span>
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(event) => onChange({ ...settings, reducedMotion: event.target.checked })}
          />
        </label>
      </section>
    </div>
  );
}
