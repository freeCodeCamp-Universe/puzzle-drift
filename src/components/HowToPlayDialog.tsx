import { ArrowRight, CircleHelp, Diamond, KeyRound, MousePointer2, X } from 'lucide-react';

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
  if (!isOpen) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="how-to-dialog" role="dialog" aria-modal="true" aria-labelledby="how-to-title">
        <header className="dialog-header">
          <div className="dialog-title">
            <CircleHelp aria-hidden="true" />
            <h2 id="how-to-title">How To Play</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close how to play">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="how-to-list">
          {HOW_TO_PLAY_ITEMS.map(({ icon: Icon, title, description }) => (
            <article className="how-to-item" key={title}>
              <Icon aria-hidden="true" />
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
