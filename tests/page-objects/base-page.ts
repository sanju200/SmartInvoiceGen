import { Page } from '@playwright/test';

export class BasePage {
  constructor(protected page: Page) {}

  // Common elements
  get toastMessage() {
    return this.page.getByTestId('toast-message');
  }

  get loadingSpinner() {
    return this.page.getByTestId('loading-spinner');
  }

  // Common actions
  async waitForLoading() {
    // If a loading spinner test-id exists, wait briefly for it, otherwise continue
    try {
      await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 2000 });
    } catch {
      // ignore if spinner not present
    }
    await this.page.waitForLoadState('networkidle');
  }

  async getToastMessage() {
    await this.toastMessage.waitFor({ state: 'visible' });
    return this.toastMessage.textContent();
  }
}

export class LoginPage extends BasePage {
  // Elements
  get emailInput() {
    return this.page.locator('input[id="email"]');
  }

  get passwordInput() {
    return this.page.locator('input[type="password"]');
  }

  get loginButton() {
    return this.page.getByRole('button', { name: /sign in/i });
  }

  // Actions
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    // Wait for either navigation away from /login or network to go idle
    try {
      await Promise.race([
        this.page.waitForURL(url => !new URL(url).pathname.includes('/login'), { timeout: 15000 }),
        this.page.waitForLoadState('networkidle')
      ]);
    } catch {
      // Fallback to a short delay; subsequent tests will assert actual page state
      await this.page.waitForTimeout(1000);
    }
  }
}

export class InvoicePage extends BasePage {
  // Elements
  get newInvoiceButton() {
    return this.page.getByRole('button', { name: /new invoice/i });
  }

  get clientNameInput() {
    return this.page.getByLabel(/client name/i);
  }

  get clientEmailInput() {
    return this.page.getByLabel(/email/i);
  }

  get addItemButton() {
    return this.page.getByRole('button', { name: /add item/i });
  }

  get saveInvoiceButton() {
    return this.page.getByRole('button', { name: /save invoice/i });
  }

  // Actions
  async createBasicInvoice(clientName: string, clientEmail: string) {
    await this.newInvoiceButton.click();
    await this.clientNameInput.fill(clientName);
    await this.clientEmailInput.fill(clientEmail);
    await this.saveInvoiceButton.click();
    await this.waitForLoading();
  }
}
