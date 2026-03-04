import { test } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { AuthenticatedPage } from '../pages/AuthenticatedPage';

test('Load web app successfully', async ({ page }) => {
  const homePage = new HomePage(page);

  await homePage.goto();
  await homePage.expectLoaded(process.env.BASE_URL || 'localhost:5173');
});

test('Click LOG IN button and verify login page loads', async ({ page }) => {
  const homePage = new HomePage(page);
  const loginPage = new LoginPage(page);

  await homePage.goto();
  await homePage.clickLogin();
  await loginPage.expectLoaded();
});

test('Login with valid credentials', async ({ page }) => {
  const homePage = new HomePage(page);
  const loginPage = new LoginPage(page);
  const authenticatedPage = new AuthenticatedPage(page);

  await homePage.goto();
  await homePage.clickLogin();
  await loginPage.login(process.env.LOGIN_USERNAME!, process.env.LOGIN_PASSWORD!);
  await page.waitForURL(/.*/, { timeout: 5000 });
  await authenticatedPage.expectAuthenticated();
});
