import { expect, type Page } from '@playwright/test';

export class ResetPasswordPage {
  constructor(private readonly page: Page) {}

  async goto(resetLink: string): Promise<void> {
    await this.page.goto(resetLink);
  }

  async resetPassword(newPassword: string): Promise<void> {
    await this.page.locator('input[id="password-reset"]').fill(newPassword);
    await this.page.locator('input[id="re-enter-password"]').fill(newPassword);
    await this.page.locator('button[type="submit"]').click();
  }

  async expectResetSuccess(): Promise<void> {
    await expect(this.page.locator('text=/password.*Changed.*successful/i')).toBeVisible({ timeout: 10000 });
  }
}