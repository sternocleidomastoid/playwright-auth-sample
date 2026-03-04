import { test } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { AuthenticatedPage } from '../pages/AuthenticatedPage';

test.skip('Complete signup flow', async ({ page }) => {
  const gmailTestEmail = process.env.GOOGLE_TEST_EMAIL || '';
  const gmailSignUpPassword = process.env.SIGNUP_PASSWORD || '';
  const homePage = new HomePage(page);
  const loginPage = new LoginPage(page);
  const signupPage = new SignupPage(page);
  const authenticatedPage = new AuthenticatedPage(page);

  await homePage.goto();
  await homePage.clickLogin();
  await loginPage.goToSignup();
  await signupPage.expectLoaded();
  await signupPage.signup(gmailTestEmail, gmailSignUpPassword);
  await page.waitForTimeout(2000);
  await authenticatedPage.expectAuthenticated();
});
