import { fireEvent, userEvent, waitFor } from "storybook/test";

/** The element `selector` finds anywhere in the page, a menu's or a dialog's too, once it is there
 * and can be pressed. */
export const found = (selector: string): Promise<HTMLElement> =>
  waitFor(() => {
    const element = document.querySelector<HTMLElement>(selector);
    if (element === null || element.hasAttribute("disabled")) {
      throw new Error(`${selector} is not there to press yet`);
    }
    return element;
  });

/** A play's step: a click on what `selector` finds. */
export async function press(selector: string): Promise<void> {
  await userEvent.click(await found(selector));
}

/** A play's step: a right-click in the middle of what `selector` finds, as a PC opens a menu. */
export async function rightClick(selector: string): Promise<void> {
  const element = await found(selector);
  const box = element.getBoundingClientRect();
  await fireEvent.contextMenu(element, {
    clientX: box.left + box.width / 2,
    clientY: box.top + box.height / 2,
  });
}
