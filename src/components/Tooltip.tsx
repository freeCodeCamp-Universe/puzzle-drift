import {
  Children,
  cloneElement,
  isValidElement,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

type TooltipPlacement = 'top';

type TooltipProps = {
  children: ReactNode;
  content: ReactNode;
  disabled?: boolean;
  placement?: TooltipPlacement;
  reducedMotion?: boolean;
};

const LONG_PRESS_DELAY_MS = 520;

export function Tooltip({ children, content, disabled = false, placement = 'top', reducedMotion = false }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = useId();
  const longPressTimeoutRef = useRef<number | null>(null);
  const child = Children.only(children);

  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current !== null) {
        window.clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', closeOnEscape);

    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  const closeTooltip = () => {
    setIsOpen(false);
  };

  const clearLongPress = () => {
    if (longPressTimeoutRef.current !== null) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const startLongPress = (event: PointerEvent<HTMLSpanElement>) => {
    if (disabled) {
      return;
    }

    if (event.pointerType !== 'touch') {
      return;
    }

    clearLongPress();
    longPressTimeoutRef.current = window.setTimeout(() => setIsOpen(true), LONG_PRESS_DELAY_MS);
  };

  if (!isValidElement<Record<string, unknown>>(child)) {
    return null;
  }

  const describedBy = isOpen
    ? [child.props['aria-describedby'], tooltipId].filter(Boolean).join(' ')
    : child.props['aria-describedby'];
  const tooltipChild = cloneElement(child as ReactElement<Record<string, unknown>>, {
    'aria-describedby': describedBy,
  });

  return (
    <span
      className="tooltip-anchor"
      data-placement={placement}
      onBlur={closeTooltip}
      onFocus={() => {
        if (!disabled) {
          setIsOpen(true);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          closeTooltip();
        }
      }}
      onMouseEnter={() => {
        if (!disabled) {
          setIsOpen(true);
        }
      }}
      onMouseLeave={closeTooltip}
      onPointerCancel={clearLongPress}
      onPointerDown={startLongPress}
      onPointerLeave={clearLongPress}
      onPointerUp={clearLongPress}
    >
      {tooltipChild}
      {isOpen ? (
        <span
          className={`tooltip-bubble${reducedMotion ? ' no-motion' : ''}`}
          id={tooltipId}
          role="tooltip"
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
