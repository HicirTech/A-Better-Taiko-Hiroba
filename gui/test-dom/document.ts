import { afterAll, afterEach, beforeAll } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { cleanup } from "@testing-library/react/pure";

/** Gives the calling file's tests a document, taken away again once they have run. */
export function inADocument(): void {
  // Every test file shares one global object: a document left behind would reach the node tests.
  beforeAll(() => {
    GlobalRegistrator.register();
    Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
  });
  afterEach(cleanup);
  afterAll(async () => {
    Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
    await GlobalRegistrator.unregister();
  });
}
