/** A ref that keeps a CSS property on the root at its node's height, and drops it at unmount. */
export function publishHeightOf(property: string) {
  return (node: HTMLElement | null) => {
    if (node === null) {
      return;
    }

    const root = document.documentElement;
    const publish = () =>
      root.style.setProperty(property, `${node.getBoundingClientRect().height}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(node);
    return () => {
      observer.disconnect();
      root.style.removeProperty(property);
    };
  };
}
