import { ArrowRight, Diamond, KeyRound, MousePointer2, X } from 'lucide-react';
import { useRef } from 'react';
import { useModalAccessibility } from '../hooks/useModalAccessibility';

type HowToPlayDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

const HOW_TO_PLAY_ITEMS = [
  {
    icon: ArrowRight,
    title: 'Move with intent',
    description: 'Use Arrow keys, WASD, or the on-screen controls to slide one tile at a time.',
  },
  {
    icon: Diamond,
    title: 'Reach the exit',
    description: 'Plan around walls, portals, spikes, switches, gates, ice, and one-way paths.',
  },
  {
    icon: KeyRound,
    title: 'Collect keys',
    description: 'Some exits need keys before the route can be completed.',
  },
  {
    icon: MousePointer2,
    title: 'Chase cleaner routes',
    description: 'Replay levels to improve move counts, times, and star ratings.',
  },
];

export function HowToPlayDialog({ isOpen, onClose }: HowToPlayDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useModalAccessibility({ dialogRef, isOpen, onEscape: onClose });

  if (!isOpen) {
    return null;
  }

  return (
    <dialog
      className="dialog-backdrop dialog-shell"
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="how-to-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="how-to-dialog"
      >
        <header className="dialog-header">
          <div className="dialog-title">
            <h2 id="how-to-title">How To Play</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close how to play">
            <X aria-hidden="true" />
          </button>
        </header>

        <ul className="how-to-list">
          {HOW_TO_PLAY_ITEMS.map(({ icon: Icon, title, description }) => (
            <li className="how-to-list-item" key={title}>
              <article className="how-to-item">
                <Icon aria-hidden="true" />
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </dialog>
  );
}
