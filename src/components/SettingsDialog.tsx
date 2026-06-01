import {
  Accessibility,
  AlertTriangle,
  Eye,
  Keyboard,
  Lightbulb,
  RefreshCcw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { GameSettings } from '../types/game';

type SettingsDialogProps = {
  isOpen: boolean;
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
  onClose: () => void;
  onResetProgress: () => void;
};

type ToggleSettingProps<Key extends keyof GameSettings> = {
  checked: GameSettings[Key] & boolean;
  description: string;
  icon: ReactNode;
  label: string;
  onChange: (value: boolean) => void;
};

function ToggleSetting<Key extends keyof GameSettings>({
  checked,
  description,
  icon,
  label,
  onChange,
}: ToggleSettingProps<Key>) {
  return (
    <label className="settings-toggle-row">
      <span className="settings-toggle-copy">
        <span className="settings-toggle-label">
          {icon}
          <strong>{label}</strong>
        </span>
        <span>{description}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-switch" aria-hidden="true" />
    </label>
  );
}

export function SettingsDialog({
  isOpen,
  settings,
  onChange,
  onClose,
  onResetProgress,
}: SettingsDialogProps) {
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [isShortcutListOpen, setIsShortcutListOpen] = useState(false);
  const dialogRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsConfirmingReset(false);
      setIsShortcutListOpen(false);

      return undefined;
    }

    const dialog = dialogRef.current;
    const focusableElements = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1);

    window.setTimeout(() => focusableElements()[0]?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();

        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const elements = focusableElements();
      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];

      if (!firstElement || !lastElement) {
        event.preventDefault();

        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const updateSetting = <Key extends keyof GameSettings>(key: Key, value: GameSettings[Key]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="settings-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <header className="dialog-header settings-header">
          <div className="dialog-title">
            <div>
              <p className="eyebrow">game menu</p>
              <h2 id="settings-title">Settings</h2>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close settings">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="settings-section-card" aria-label="Accessibility settings">
          <div className="settings-section-heading">
            <Accessibility aria-hidden="true" />
            <div>
              <h3>Accessibility</h3>
              <p>Adjust motion and contrast for a clearer play surface.</p>
            </div>
          </div>
          <ToggleSetting
            checked={settings.reducedMotion}
            description="Reduce animated movement, flashes, and completion effects."
            icon={<Sparkles aria-hidden="true" />}
            label="Reduced motion"
            onChange={(value) => updateSetting('reducedMotion', value)}
          />
          <ToggleSetting
            checked={settings.highContrast}
            description="Increase tile, button, modal, and text contrast."
            icon={<Eye aria-hidden="true" />}
            label="High contrast"
            onChange={(value) => updateSetting('highContrast', value)}
          />
        </div>

        <div className="settings-section-card" aria-label="Gameplay settings">
          <div className="settings-section-heading">
            <Lightbulb aria-hidden="true" />
            <div>
              <h3>Gameplay</h3>
              <p>Choose how much guidance and confirmation you want during a run.</p>
            </div>
          </div>
          <ToggleSetting
            checked={settings.hintNudgesEnabled}
            description="Show gentle hint prompts when you seem stuck."
            icon={<Lightbulb aria-hidden="true" />}
            label="Hint nudges"
            onChange={(value) => updateSetting('hintNudgesEnabled', value)}
          />
          <ToggleSetting
            checked={settings.confirmRestart}
            description="Ask before restarting a level."
            icon={<RefreshCcw aria-hidden="true" />}
            label="Confirm restart"
            onChange={(value) => updateSetting('confirmRestart', value)}
          />
        </div>

        <div className="settings-section-card" aria-label="Keyboard shortcuts">
          <button
            type="button"
            className="settings-collapse-button"
            onClick={() => setIsShortcutListOpen((currentValue) => !currentValue)}
            aria-expanded={isShortcutListOpen}
          >
            <span className="settings-section-heading">
              <Keyboard aria-hidden="true" />
              <span>
                <strong>Keyboard Shortcuts</strong>
                <em>Show the complete keyboard command list.</em>
              </span>
            </span>
          </button>
          {isShortcutListOpen ? (
            <dl className="settings-shortcut-list">
              <div>
                <dt>Move</dt>
                <dd>Arrow Keys / WASD</dd>
              </div>
              <div>
                <dt>Undo</dt>
                <dd>U / Backspace</dd>
              </div>
              <div>
                <dt>Restart</dt>
                <dd>R</dd>
              </div>
              <div>
                <dt>Pause</dt>
                <dd>P / Esc</dd>
              </div>
              <div>
                <dt>Hints</dt>
                <dd>H</dd>
              </div>
              <div>
                <dt>Next Level</dt>
                <dd>Spacebar / Enter</dd>
              </div>
            </dl>
          ) : null}
        </div>

        <div className="settings-section-card settings-danger-zone" aria-label="Data settings">
          {isConfirmingReset ? (
            <div className="confirm-reset-panel" role="alertdialog" aria-labelledby="reset-title">
              <div className="settings-section-heading">
                <AlertTriangle aria-hidden="true" />
                <div>
                  <h3 id="reset-title">Reset all progress?</h3>
                  <p>
                    This clears completed levels, stars, best moves, best times, and unlocked levels. Settings will be
                    preserved.
                  </p>
                </div>
              </div>
              <div className="confirm-actions">
                <button type="button" className="menu-button" onClick={() => setIsConfirmingReset(false)}>
                  <X aria-hidden="true" />
                  <span>Cancel</span>
                </button>
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
              </div>
            </div>
          ) : (
            <>
              <div className="settings-section-heading">
                <ShieldAlert aria-hidden="true" />
                <div>
                  <h3>Data</h3>
                  <p>Resetting progress cannot be undone. Settings will be preserved.</p>
                </div>
              </div>
              <button type="button" className="menu-button danger" onClick={() => setIsConfirmingReset(true)}>
                <RotateCcw aria-hidden="true" />
                <span>Reset Progress</span>
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
