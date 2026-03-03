import type { FullConfig } from '@playwright/test';
import dotenv from 'dotenv';
import { deleteAuth0User } from './tests/testHelpers';

dotenv.config();

async function globalTeardown(_config: FullConfig): Promise<void> {
  const signupTestEmail = process.env.GOOGLE_TEST_EMAIL || '';

  if (!signupTestEmail) {
    return;
  }

  console.log('Global teardown: cleaning up test user...');
  await deleteAuth0User(signupTestEmail);
}

export default globalTeardown;
