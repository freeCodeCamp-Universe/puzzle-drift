import {
  Accessibility,
  AlertTriangle,
  Eye,
  Keyboard,
  Lightbulb,
  Move,
  RefreshCcw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useModalAccessibility } from '../hooks/useModalAccessibility';
import type { ControlStyle, GameSettings } from '../types/game';

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
  const descriptionId = useId();

  return (
    <label className="settings-toggle-row">
      <span className="settings-toggle-copy">
        <span className="settings-toggle-label">
          {icon}
          <strong>{label}</strong>
        </span>
        <span id={descriptionId}>{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        aria-describedby={descriptionId}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-switch" aria-hidden="true" />
    </label>
  );
}

const CONTROL_STYLE_OPTIONS: Array<{
  description: string;
  label: string;
  value: ControlStyle;
}> = [
  {
    description: 'Use the on-screen directional pad.',
    label: 'Buttons',
    value: 'buttons',
  },
  {
    description: 'Move by swiping across the board.',
    label: 'Swipe',
    value: 'swipe',
  },
  {
    description: 'Keep buttons visible and allow swipes.',
    label: 'Both',
    value: 'both',
  },
];

export function SettingsDialog({
  isOpen,
  settings,
  onChange,
  onClose,
  onResetProgress,
}: SettingsDialogProps) {
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [isShortcutListOpen, setIsShortcutListOpen] = useState(false);
  const controlStyleHeadingId = useId();
  const controlStyleDescriptionId = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useModalAccessibility({ dialogRef, isOpen, onEscape: onClose });

  useEffect(() => {
    if (!isOpen) {
      setIsConfirmingReset(false);
      setIsShortcutListOpen(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const updateSetting = <Key extends keyof GameSettings>(key: Key, value: GameSettings[Key]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <dialog
      className="dialog-backdrop dialog-shell"
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="settings-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="settings-dialog"
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

        <fieldset className="settings-section-card">
          <legend className="settings-section-heading settings-section-legend">
            <Accessibility aria-hidden="true" />
            <div>
              <h3>Accessibility</h3>
            </div>
          </legend>
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
        </fieldset>

        <fieldset className="settings-section-card">
          <legend className="settings-section-heading settings-section-legend">
            <Lightbulb aria-hidden="true" />
            <div>
              <h3>Gameplay</h3>
            </div>
          </legend>
          <ToggleSetting
            checked={settings.hintNudgesEnabled}
            description="Show gentle hint prompts when you seem stuck."
            icon={<Lightbulb aria-hidden="true" />}
            label="Hint nudges"
            onChange={(value) => updateSetting('hintNudgesEnabled', value)}
          />
          <ToggleSetting
            checked={settings.focusMode}
            description="Hide automatic puzzle assistance and nudges."
            icon={<ShieldAlert aria-hidden="true" />}
            label="Focus Mode"
            onChange={(value) => updateSetting('focusMode', value)}
          />
          <ToggleSetting
            checked={settings.confirmRestart}
            description="Ask before restarting a level."
            icon={<RefreshCcw aria-hidden="true" />}
            label="Confirm restart"
            onChange={(value) => updateSetting('confirmRestart', value)}
          />
          <div
            className="settings-control-style"
            role="radiogroup"
            aria-labelledby={controlStyleHeadingId}
            aria-describedby={controlStyleDescriptionId}
          >
            <div className="settings-section-heading">
              <Move aria-hidden="true" />
              <div>
                <h3 id={controlStyleHeadingId}>Control Style</h3>
                <p id={controlStyleDescriptionId}>Choose how touch movement works during a run.</p>
              </div>
            </div>
            <div className="control-style-options">
              {CONTROL_STYLE_OPTIONS.map((option) => (
                <label className="control-style-option" key={option.value}>
                  <input
                    type="radio"
                    name="control-style"
                    value={option.value}
                    checked={settings.controlStyle === option.value}
                    onChange={() => updateSetting('controlStyle', option.value)}
                  />
                  <span>
                    <strong>{option.label}</strong>
                    <em>{option.description}</em>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </fieldset>

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
            <div className="confirm-reset-panel" aria-labelledby="reset-title" aria-describedby="reset-description">
              <div className="settings-section-heading">
                <AlertTriangle aria-hidden="true" />
                <div>
                  <h3 id="reset-title">Reset all progress?</h3>
                  <p id="reset-description">
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
                    onClose();
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
    </dialog>
  );
}
