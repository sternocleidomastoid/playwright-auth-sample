import { expect, type Page } from '@playwright/test';

export class HomePage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(process.env.BASE_URL || '/');
  }

  async clickLogin(): Promise<void> {
    await this.page.click('button:has-text("LOG IN")');
  }

  async expectLoaded(baseUrlOrHostPattern: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(baseUrlOrHostPattern));
    await expect(this.page).toHaveTitle(/./);
    await expect(this.page.locator('text=Get started by signing in to your account')).toBeVisible();
  }
}