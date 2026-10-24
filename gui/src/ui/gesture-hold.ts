let holds = 0;

/** A drag that has a row in hand holds the page's own swipes and pull until it lets go. */
export function holdGestures(): () => void {
  holds += 1;
  let released = false;
  return () => {
    if (!released) {
      released = true;
      holds -= 1;
    }
  };
}

export const gesturesHeld = (): boolean => holds > 0;
