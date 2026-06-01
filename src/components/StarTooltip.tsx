import { Star } from 'lucide-react';
import { Tooltip } from './Tooltip';

const STAR_EXPLANATIONS = {
  1: {
    description: 'Complete the level.',
    title: '1 Star',
  },
  2: {
    description: 'Complete within target moves.',
    title: '2 Stars',
  },
  3: {
    description: 'Complete within target moves and target time.',
    title: '3 Stars',
  },
} as const;

type StarTier = keyof typeof STAR_EXPLANATIONS;

type StarTooltipProps = {
  className?: string;
  earned?: boolean;
  focusable?: boolean;
  reducedMotion?: boolean;
  tier: StarTier;
};

export function StarTooltip({ className, earned = true, focusable = true, reducedMotion = false, tier }: StarTooltipProps) {
  const explanation = STAR_EXPLANATIONS[tier];
  const stateClass = earned ? 'star-earned' : 'star-empty';

  return (
    <Tooltip
      content={
        <span className="star-tooltip-content">
          <strong>{explanation.title}</strong>
          <span>{explanation.description}</span>
        </span>
      }
      reducedMotion={reducedMotion}
    >
      <span
        aria-label={`${explanation.title}: ${explanation.description}`}
        className={`star-tooltip-trigger ${stateClass}${className ? ` ${className}` : ''}`}
        role="img"
        tabIndex={focusable ? 0 : undefined}
      >
        <Star aria-hidden="true" />
      </span>
    </Tooltip>
  );
}
