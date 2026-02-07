import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const context = browser.contexts()[0];

  // Login first
  const loginResponse = await context.request.post('http://localhost:3001/api/v1/auth/login', {
    data: {
      email: 'demo@findclass.nz',
      password: 'Password123',
    },
  });

  console.log('Login response status:', loginResponse.status());

  const loginData = await loginResponse.json();
  const token = loginData.data?.token || loginData.data?.accessToken;

  if (!token) {
    console.error('No token found in login response');
    await browser.close();
    process.exit(1);
  }

  console.log('Token obtained (length):', token.length);

  // Set token and navigate
  await page.goto('http://localhost:3002/courses/20000000-0000-0000-0000-000000000001');
  await page.evaluate((t) => {
    localStorage.setItem('auth_token', t);
  }, token);

  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  console.log('Page title:', await page.title());
  console.log('Page URL:', page.url());

  // Check for errors
  page.on('pageerror', (err) => {
    console.error('Page error:', err.message);
    console.error('Error stack:', err.stack);
  });

  // Also capture console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('Console error:', msg.text());
    }
  });

  // Get page content
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Page body preview:', bodyText.substring(0, 500));

  // Check if it's an error page
  const hasError = bodyText.includes('Something went wrong') || bodyText.includes('Try Again');
  if (hasError) {
    console.log('✗ Page is showing error state');
    const errorElement = await page.$('.error-state, [data-testid="course-error-state"]');
    if (errorElement) {
      const errorText = await errorElement.textContent();
      console.log('Error message:', errorText);
    }
  } else {
    // Get all buttons
    const buttons = await page.$$('button');
    console.log('Total buttons:', buttons.length);

    // Check each button for data-testid
    for (let i = 0; i < buttons.length; i++) {
      const testid = await buttons[i].getAttribute('data-testid');
      const text = await buttons[i].textContent();
      if (testid) {
        console.log(`[+] Button ${i}: data-testid="${testid}", text="${text}"`);
      }
    }

    // Try to find favorite button
    const favButton = await page.$('button[data-testid="favorite-button"]');
    const saveButton = await page.$('button[data-testid="save-button"]');

    if (favButton) {
      console.log('✓ Found favorite-button!');
    } else if (saveButton) {
      console.log('✓ Found save-button (old name)!');
    } else {
      console.log('✗ No favorite button found');
    }
  }

  await browser.close();
})();
