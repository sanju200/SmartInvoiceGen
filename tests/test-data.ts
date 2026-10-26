// Test data for E2E tests
export const testInvoice = {
  client: {
    name: 'John Doe',
    email: 'john.doe@example.com',
    address: '123 Test St',
    city: 'Test City',
    state: 'Test State',
    zip: '12345',
    country: 'Test Country'
  },
  items: [
    {
      description: 'Website Development',
      quantity: '1',
      price: '1000',
      tax: '10'
    },
    {
      description: 'UI/UX Design',
      quantity: '2',
      price: '500',
      tax: '5'
    }
  ],
  notes: 'Thank you for your business!',
  terms: 'Payment due in 30 days'
};

export const testUser = {
  email: 'test@example.com',
  password: 'Test@12345'
};
