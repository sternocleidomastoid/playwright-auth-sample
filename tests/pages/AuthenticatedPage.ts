import { expect, type Page } from '@playwright/test';

export class AuthenticatedPage {
  constructor(private readonly page: Page) {}

  async expectAuthenticated(): Promise<void> {
    await expect(this.page.locator('text=Successfully authenticated!')).toBeVisible();
  }
}