import { type Page } from '@playwright/test';

export class ForgotPasswordPage {
  constructor(private readonly page: Page) {}

  async expectLoaded(): Promise<void> {
    await this.page.waitForURL(/.*forgot.*|.*reset.*/, { timeout: 5000 });
  }

  async requestReset(email: string): Promise<void> {
    await this.page.locator('input[name="email"]').fill(email);
    await this.page.locator('button[type="submit"][name="action"][value="default"]').click();
  }
}