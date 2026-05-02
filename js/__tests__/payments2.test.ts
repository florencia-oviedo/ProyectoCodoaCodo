import { createInvoice, applyDiscount, getInvoiceSummary } from '../payments2';

describe('createInvoice', () => {
  it('should return an error for invalid customers', () => {
    // Test case 1: Invalid customer name
    const result = createInvoice({ name: '', email: '' }, []);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Cliente inválido');

    // Test case 2: Missing customer name
    const result2 = createInvoice({}, []);
    expect(result2.success).toBe(false);
    expect(result2.error).toBe('Cliente inválido');
  });

  it('should return an error for empty or missing items', () => {
    // Test case 1: Empty items array
    const result = createInvoice({ name: 'John Doe', email: 'john@example.com' }, []);
    expect(result.success).toBe(false);
    expect(result.error).toBe('La factura debe contener al menos un ítem');

    // Test case 2: Missing items array
    const result2 = createInvoice({ name: 'John Doe', email: 'john@example.com' });
    expect(result2.success).toBe(false);
    expect(result2.error).toBe('La factura debe contener al menos un ítem');
  });

  it('should return an error for invalid currency codes', () => {
    // Test case 1: Invalid currency code (not a string)
    const result = createInvoice({ name: 'John Doe', email: 'john@example.com' }, [], 123);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Código de moneda inválido');

    // Test case 2: Invalid currency code (not in ISO 4217 format)
    const result2 = createInvoice({ name: 'John Doe', email: 'john@example.com' }, [], 'USD');
    expect(result2.success).toBe(false);
    expect(result2.error).toBe('Código de moneda inválido');
  });

  it('should return a valid invoice with default currency', () => {
    // Test case 1: Default currency (ARS)
    const result = createInvoice({ name: 'John Doe', email: 'john@example.com' }, [
      { description: 'Item 1', quantity: 1, unitPrice: 100 },
      { description: 'Item 2', quantity: 2, unitPrice: 50 }
    ]);
    expect(result.success).toBe(true);
    expect(result.invoice).toMatchObject({
      invoiceNumber: expect.any(String),
      customer: {
        name: 'John Doe',
        email: 'john@example.com'
      },
      items: [
        {
          description: 'Item 1',
          quantity: 1,
          unitPrice: 100,
          lineTotal: 100
        },
        {
          description: 'Item 2',
          quantity: 2,
          unitPrice: 50,
          lineTotal: 100
        }
      ],
      currency: 'ARS',
      total: 200,
      issuedAt: expect.any(String),
      status: 'pending'
    });
  });

  it('should return a valid invoice with custom currency', () => {
    // Test case 1: Custom currency (USD)
    const result = createInvoice({ name: 'John Doe', email: 'john@example.com' }, [
      { description: 'Item 1', quantity: 1, unitPrice: 100 },
      { description: 'Item 2', quantity: 2, unitPrice: 50 }
    ], 'USD');
    expect(result.success).toBe(true);
    expect(result.invoice).toMatchObject({
      invoiceNumber: expect.any(String),
      customer: {
        name: 'John Doe',
        email: 'john@example.com'
      },
      items: [
        {
          description: 'Item 1',
          quantity: 1,
          unitPrice: 100,
          lineTotal: 100
        },
        {
          description: 'Item 2',
          quantity: 2,
          unitPrice: 50,
          lineTotal: 100
        }
      ],
      currency: 'USD',
      total: 200,
      issuedAt: expect.any(String),
      status: 'pending'
    });
  });
});

describe('applyDiscount', () => {
  it('should return an error for invalid invoices', () => {
    // Test case 1: Invalid invoice (no total property)
    const result = applyDiscount({ invoiceNumber: 'INV-1234567890' }, 10);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Factura inválida');

    // Test case 2: Invalid invoice (no total property)
    const result2 = applyDiscount({ invoiceNumber: 'INV-1234567890', total: null }, 10);
    expect(result2.success).toBe(false);
    expect(result2.error).toBe('Factura inválida');
  });

  it('should return an error for invalid discounts', () => {
    // Test case 1: Invalid discount (not a number)
    const result = applyDiscount({ invoiceNumber: 'INV-1234567890', total: 100 }, '10%');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Descuento inválido');

    // Test case 2: Invalid discount (out of range)
    const result2 = applyDiscount({ invoiceNumber: 'INV-1234567890', total: 100 }, -10);
    expect(result2.success).toBe(false);
    expect(result2.error).toBe('Descuento inválido');
  });

  it('should return a valid invoice with a discount', () => {
    // Test case 1: Valid discount (10%)
    const result = applyDiscount({ invoiceNumber: 'INV-1234567890', total: 100 }, 10);
    expect(result.success).toBe(true);
    expect(result.invoice).toMatchObject({
      invoiceNumber: 'INV-1234567890',
      discountPercent: 10,
      discountAmount: 10,
      total: 90,
      status: 'discounted'
    });
  });
});

describe('getInvoiceSummary', () => {
  it('should return an error for invalid invoices', () => {
    // Test case 1: Invalid invoice (not an object)
    const result = getInvoiceSummary(null);
    expect(result).toBe('Factura inválida');

    // Test case 2: Invalid invoice (not an object)
    const result2 = getInvoiceSummary(undefined);
    expect(result2).toBe('Factura inválida');
  });

  it('should return a valid summary for a valid invoice', () => {
    // Test case 1: Valid invoice (with items and status)
    const result = getInvoiceSummary({
      invoiceNumber: 'INV-1234567890',
      customer: { name: 'John Doe', email: 'john@example.com' },
      items: [
        { description: 'Item 1', quantity: 1, unitPrice: 100, lineTotal: 100 },
        { description: 'Item 2', quantity: 2, unitPrice: 50, lineTotal: 100 }
      ],
      currency: 'ARS',
      total: 200,
      issuedAt: '2022-01-01T00:00:00.000Z',
      status: 'discounted'
    });
    expect(result).toBe('Factura INV-1234567890: 2 item(s), total 200 ARS, estado discounted.');
  });
});
