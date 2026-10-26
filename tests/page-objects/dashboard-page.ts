import { Locator, Page, expect } from '@playwright/test';

export class DashboardPage {
  protected readonly page: Page;

  // Locators
  public readonly totalInvoicesCard: Locator;
  public readonly paidInvoicesCard: Locator;
  public readonly pendingInvoicesCard: Locator;
  public readonly totalRevenueCard: Locator;
  public readonly recentInvoicesTable: Locator;
  public readonly viewAllLink: Locator;
  public readonly dateRangeFilter: Locator;
  public readonly revenueChart: Locator;
  public readonly statusChart: Locator;
  public readonly errorMessage: Locator;
  public readonly loadingSpinner: Locator;
  public readonly pageTitle: Locator;
  public readonly pageDescription: Locator;

  // Excel Upload Modal Locators
  public readonly uploadExcelButton: Locator;
  public readonly excelUploadModal: Locator;
  public readonly excelUploadInput: Locator;
  public readonly uploadDropZone: Locator;
  public readonly uploadSubmitButton: Locator;
  public readonly uploadCancelButton: Locator;
  public readonly uploadSuccessMessage: Locator;
  public readonly uploadErrorMessage: Locator;
  public readonly dialogCloseButton: Locator;
  public readonly projectDownloadButton: Locator;
  public readonly projectRows: Locator;


  constructor(page: Page) {
    this.page = page;

    // Initialize locators
    this.totalInvoicesCard = page.locator('.summary-card').filter({ hasText: 'Total Invoices' });
    this.paidInvoicesCard = page.locator('.summary-card').filter({ hasText: 'Paid Invoices' });
    this.pendingInvoicesCard = page.locator('.summary-card').filter({ hasText: 'Pending Invoices' });
    this.totalRevenueCard = page.locator('.summary-card').filter({ hasText: 'Total Revenue' });
    this.recentInvoicesTable = page.locator('table');
    this.viewAllLink = page.getByRole('link', { name: 'View All' }).first();
    this.dateRangeFilter = page.getByLabel('Date Range');
    this.revenueChart = page.locator('.revenue-chart');
    this.statusChart = page.locator('.status-chart');
    this.errorMessage = page.locator('.error-message');
    this.loadingSpinner = page.locator('.loading-spinner');
    this.pageTitle = page.getByRole('heading', { name: 'Projects Dashboard' });
    this.pageDescription = page.getByText('Manage working hours and invoices');

    // Excel Upload Modal
    this.uploadExcelButton = page.getByRole('button', { name: /upload excel/i }).first();
    this.excelUploadModal = page.getByRole('dialog');
    this.excelUploadInput = page.locator('input[type="file"][accept=".xlsx,.xls"]');
    this.uploadDropZone = page.locator('.border-dashed');
    this.uploadSubmitButton = page.getByRole('button', { name: /import/i }).first();
    this.dialogCloseButton = page.getByRole('button', { name: /close/i }).first();
    // Each project card has class "group" and contains a Download button
    this.projectRows = page.locator('.group').filter({ has: page.locator('button[title="Download"]') });
    this.projectDownloadButton = this.projectRows.locator('button[title="Download"]').first();
    this.uploadSuccessMessage = page.getByText(/imported successfully/i);
    this.uploadErrorMessage = page.getByRole('alert');
  }

  // Navigation
  async navigateTo() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  // Wait for dashboard to load
  async waitForDashboardLoaded() {
    // Wait for the page to be fully loaded
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('load');

    // Add a small delay to ensure all dynamic content is loaded
    await this.page.waitForTimeout(1000);

    // Wait for either the main content or a loading indicator to disappear
    await Promise.race([
      // Wait for the main content to be visible
      this.page.getByRole('heading', { name: 'Projects Dashboard' }).waitFor({ state: 'visible', timeout: 30000 }),
      // Or wait for any loading indicators to disappear
      this.page.getByTestId('loading-indicator').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => { })
    ]);

    // Additional check for the subtitle
    await this.page.getByText('Manage working hours and invoices').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
      console.warn('Subtitle not found, but continuing with test');
    });
  }

  // Actions
  async selectDateRange(range: string) {
    await this.dateRangeFilter.click();
    await this.page.getByText(range).click();
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToInvoices() {
    await this.viewAllLink.click();
    await this.page.waitForURL(/invoices/);
  }

  // Assertions
  async verifyDashboardLoaded() {
    await expect(this.page).toHaveURL(/dashboard/);
    await expect(this.totalInvoicesCard).toBeVisible();
    await expect(this.recentInvoicesTable).toBeVisible();
  }

  async verifySummaryCards() {
    await expect(this.totalInvoicesCard).toBeVisible();
    await expect(this.paidInvoicesCard).toBeVisible();
    await expect(this.pendingInvoicesCard).toBeVisible();
    await expect(this.totalRevenueCard).toBeVisible();
  }

  async verifyChartsVisible() {
    await expect(this.revenueChart).toBeVisible({ timeout: 15000 });
    await expect(this.statusChart).toBeVisible({ timeout: 15000 });
  }

  async verifyErrorDisplayed() {
    await expect(this.errorMessage).toBeVisible();
  }

  // Table interactions
  async getRecentInvoicesCount() {
    return await this.recentInvoicesTable.locator('tbody tr').count();
  }

  async getInvoiceByIndex(index: number) {
    const row = this.recentInvoicesTable.locator('tbody tr').nth(index);
    return {
      invoiceNumber: await row.locator('td').nth(0).textContent(),
      client: await row.locator('td').nth(1).textContent(),
      amount: await row.locator('td').nth(2).textContent(),
      status: await row.locator('td').nth(3).textContent(),
      dueDate: await row.locator('td').nth(4).textContent(),
      viewButton: row.locator('button', { hasText: 'View' })
    };
  }

  // In dashboard-page.ts
  public getTotalInvoicesCard() {
    return this.totalInvoicesCard;
  }

  public getPaidInvoicesCard() {
    return this.paidInvoicesCard;
  }

  public getPendingInvoicesCard() {
    return this.pendingInvoicesCard;
  }

  public getTotalRevenueCard() {
    return this.totalRevenueCard;
  }
}
