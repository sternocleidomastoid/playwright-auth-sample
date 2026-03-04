import { expect, type Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async expectLoaded(): Promise<void> {
    await expect(this.page.locator('input[name="username"]')).toBeVisible();
    await expect(this.page.locator('input[name="password"]')).toBeVisible();
    await expect(this.page.locator('button[type="submit"][name="action"]')).toBeVisible();
  }

  async goToSignup(): Promise<void> {
    await this.page.click('a:has-text("Sign up")');
  }

  async goToForgotPassword(): Promise<void> {
    await this.page.click('a:has-text("Forgot password?")');
  }

  async fillCredentials(username: string, password: string): Promise<void> {
    await this.page.locator('input[name="username"]').fill(username);
    await this.page.locator('input[name="password"]').fill(password);
  }

  async submit(): Promise<void> {
    await this.page.locator('button[type="submit"][name="action"]').click();
  }

  async login(username: string, password: string): Promise<void> {
    await this.fillCredentials(username, password);
    await this.submit();
  }
}