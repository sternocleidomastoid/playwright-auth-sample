import { expect, type Page } from '@playwright/test';

export class SignupPage {
  constructor(private readonly page: Page) {}

  async expectLoaded(): Promise<void> {
    await this.page.waitForURL(/.*signup.*/, { timeout: 5000 });
    await expect(this.page.locator('input[name="email"]')).toBeVisible();
    await expect(this.page.locator('input[name="password"]')).toBeVisible();
    await expect(this.page.locator('text=/^Sign Up to/')).toBeVisible();
  }

  async signup(email: string, password: string): Promise<void> {
    await this.page.locator('input[name="email"]').fill(email);
    await this.page.locator('input[name="password"]').fill(password);
    await this.page.locator('button[type="submit"][name="action"]').click();
  }
}