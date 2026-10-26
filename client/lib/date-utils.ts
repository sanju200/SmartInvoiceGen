export const getLastDateOfCurrentMonth = (): string => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  // Format as YYYY-MM-DD for date input fields
  const year = lastDay.getFullYear();
  const month = String(lastDay.getMonth() + 1).padStart(2, '0');
  const day = String(lastDay.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getCurrentMonthYear = (): string => {
  const now = new Date();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear();
  return `${month} ${year}`;
};

export const getPaymentDueDate = (invoiceDate: string, dueDays: number = 15): string => {
  const date = new Date(invoiceDate);
  date.setDate(date.getDate() + dueDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
