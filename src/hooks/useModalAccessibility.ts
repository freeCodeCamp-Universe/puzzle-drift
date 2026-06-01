import { type RefObject, useEffect } from 'react';

type UseModalAccessibilityOptions = {
  dialogRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  isOpen: boolean;
  onEscape?: () => void;
};

type InertSnapshot = {
  ariaHidden: string | null;
  element: HTMLElement;
  inert: boolean;
};

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function getFocusableElements(dialog: HTMLElement | null) {
  return Array.from(dialog?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []).filter(
    (element) => !element.hasAttribute('disabled') && element.tabIndex !== -1,
  );
}

function setBackgroundInert(dialog: HTMLElement) {
  const snapshots: InertSnapshot[] = [];

  const visitOutsideDialogPath = (parent: Element) => {
    if (parent === dialog) {
      return;
    }

    Array.from(parent.children).forEach((child) => {
      if (!(child instanceof HTMLElement)) {
        return;
      }

      if (child.contains(dialog)) {
        visitOutsideDialogPath(child);

        return;
      }

      snapshots.push({
        ariaHidden: child.getAttribute('aria-hidden'),
        element: child,
        inert: child.inert,
      });
      child.inert = true;
      child.setAttribute('inert', '');
      child.setAttribute('aria-hidden', 'true');
    });
  };

  visitOutsideDialogPath(document.body);

  return () => {
    snapshots.forEach(({ ariaHidden, element, inert }) => {
      element.inert = inert;

      if (!inert) {
        element.removeAttribute('inert');
      }

      if (ariaHidden === null) {
        element.removeAttribute('aria-hidden');
      } else {
        element.setAttribute('aria-hidden', ariaHidden);
      }
    });
  };
}

function openNativeDialog(dialog: HTMLElement) {
  if (typeof HTMLDialogElement === 'undefined') {
    return undefined;
  }

  if (!(dialog instanceof HTMLDialogElement)) {
    return undefined;
  }

  if (dialog.open) {
    return undefined;
  }

  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }

  return () => {
    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
  };
}

export function useModalAccessibility({
  dialogRef,
  initialFocusRef,
  isOpen,
  onEscape,
}: UseModalAccessibilityOptions) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const dialog = dialogRef.current;

    if (!dialog) {
      return undefined;
    }

    const closeNativeDialog = openNativeDialog(dialog);
    const restoreBackground = setBackgroundInert(dialog);

    initialFocusRef?.current?.focus();

    if (!dialog.contains(document.activeElement)) {
      getFocusableElements(dialog)[0]?.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();

        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const elements = getFocusableElements(dialog);
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

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      restoreBackground();
      closeNativeDialog?.();
    };
  }, [dialogRef, initialFocusRef, isOpen, onEscape]);
}
