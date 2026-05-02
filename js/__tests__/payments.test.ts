import { processPayment, refundPayment, calculatePaymentFee } from '../payments';

describe('processPayment', () => {
  it('should throw an error for invalid amount', () => {
    expect(() => {
      processPayment(-100, '1234567890123456', '123');
    }).toThrow('Invalid amount: must be greater than 0');
  });

  it('should throw an error for amount exceeding maximum limit', () => {
    expect(() => {
      processPayment(10001, '1234567890123456', '123');
    }).toThrow('Amount exceeds maximum limit of 10000');
  });

  it('should throw an error for invalid card number', () => {
    expect(() => {
      processPayment(100, '123456789012345', '123');
    }).toThrow('Invalid card number: must be 16 digits');
  });

  it('should throw an error for invalid CVV', () => {
    expect(() => {
      processPayment(100, '1234567890123456', '12');
    }).toThrow('Invalid CVV: must be 3 digits');
  });

  it('should process a valid payment and return the expected result', () => {
    const result = processPayment(100, '1234567890123456', '123');
    expect(result).toEqual({
      success: true,
      transactionId: expect.any(String),
      amount: 100,
      timestamp: expect.any(String),
      status: 'approved'
    });
  });
});

describe('refundPayment', () => {
  it('should throw an error for missing transaction ID', () => {
    expect(() => {
      refundPayment(null, 100);
    }).toThrow('Transaction ID is required');
  });

  it('should throw an error for invalid refund amount', () => {
    expect(() => {
      refundPayment('TXN-123456789', -100);
    }).toThrow('Invalid refund amount');
  });

  it('should process a valid refund and return the expected result', () => {
    const result = refundPayment('TXN-123456789', 100);
    expect(result).toEqual({
      success: true,
      refundId: expect.any(String),
      originalTransactionId: 'TXN-123456789',
      amount: 100,
      timestamp: expect.any(String),
      status: 'refunded'
    });
  });
});

describe('calculatePaymentFee', () => {
  it('should return 0 for invalid amount', () => {
    expect(calculatePaymentFee(-100)).toBe(0);
    expect(calculatePaymentFee(0)).toBe(0);
  });

  it('should calculate the fee correctly', () => {
    expect(calculatePaymentFee(100)).toBe(2.5);
    expect(calculatePaymentFee(500)).toBe(12.5);
    expect(calculatePaymentFee(1000)).toBe(25);
  });
});
