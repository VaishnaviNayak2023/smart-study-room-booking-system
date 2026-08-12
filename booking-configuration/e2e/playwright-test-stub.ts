/**
 * Type stub for vue-tsc / tsc when @playwright/test is not installed locally.
 * Playwright's test runner still resolves the real package from node_modules at runtime.
 */

export interface Locator {
  fill(value: string): Promise<void>;
  click(): Promise<void>;
  isVisible(): Promise<boolean>;
  nth(index: number): Locator;
  first(): Locator;
}

export interface Page {
  goto(url: string): Promise<void>;
  getByLabel(label: string, options?: { exact?: boolean }): Locator;
  getByRole(
    role: string,
    options?: { name?: string | RegExp; exact?: boolean; timeout?: number },
  ): Locator;
  getByText(text: string | RegExp, options?: { timeout?: number }): Locator;
  locator(selector: string): Locator;
  waitForEvent(event: string, options?: { timeout?: number }): Promise<Download>;
}

export interface Download {
  suggestedFilename(): string;
}

export interface TestArgs {
  page: Page;
}

export interface ExpectMatchers {
  toBeVisible(options?: { timeout?: number }): Promise<void>;
  toHaveURL(pattern: RegExp | string, options?: { timeout?: number }): Promise<void>;
  toMatch(pattern: RegExp): void;
}

type TestFn = {
  describe(name: string, fn: () => void): void;
  (name: string, fn: (args: TestArgs) => Promise<void> | void): void;
};

export const test = null! as TestFn;
export const expect = null! as (actual: unknown) => ExpectMatchers;
export function defineConfig<T>(config: T): T {
  return config;
}
export const devices = null! as Record<string, Record<string, unknown>>;
