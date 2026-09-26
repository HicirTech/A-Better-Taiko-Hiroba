/**
 * A stand-in for the Capacitor module the Android layer calls, registered once for every test file
 * that imports this one. It records what the app asked of the platform; `native` is where a test
 * sets the platform's answers and reads the record.
 */
import { mock } from "bun:test";

export interface NativeHttpRequest {
  readonly url: string;
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly responseType: string;
}

export const native = {
  httpRequests: [] as NativeHttpRequest[],
  httpAnswer: (async () => ({})) as () => Promise<unknown>,

  reset(): void {
    this.httpRequests.length = 0;
    this.httpAnswer = async () => ({});
  },
};

mock.module("@capacitor/core", () => ({
  CapacitorHttp: {
    request: (options: NativeHttpRequest) => {
      native.httpRequests.push(options);
      return native.httpAnswer();
    },
  },
}));
