jest.mock('../clearAllMocks', () => ({
  clearAllMocks: jest.fn()
}));
jest.mock('../mockResolvedValue', () => ({
  mockResolvedValue: jest.fn()
}));
jest.mock('../async', () => ({
  async: jest.fn()
}));
jest.mock('../processOrder', () => ({
  processOrder: jest.fn()
}));
jest.mock('../toBe', () => ({
  toBe: jest.fn()
}));
jest.mock('../toHaveBeenCalledWith', () => ({
  toHaveBeenCalledWith: jest.fn()
}));
jest.mock('../objectContaining', () => ({
  objectContaining: jest.fn()
}));
jest.mock('../toThrow', () => ({
  toThrow: jest.fn()
}));
jest.mock('../mockRejectedValueOnce', () => ({
  mockRejectedValueOnce: jest.fn()
}));
jest.mock('../mockResolvedValueOnce', () => ({
  mockResolvedValueOnce: jest.fn()
}));
jest.mock('../toHaveBeenCalledTimes', () => ({
  toHaveBeenCalledTimes: jest.fn()
}));

const OrderProcessor = require('../OrderProcessor');
import { clearAllMocks, mockResolvedValue, async, processOrder, toBe, toHaveBeenCalledWith, objectContaining, toThrow, mockRejectedValueOnce, mockResolvedValueOnce, toHaveBeenCalledTimes } from '../dependencies';

describe('OrderProcessor', () => {
  let processor;
  let mockUser;
  let mockPayment;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new OrderProcessor();
    mockUser = { id: '123', status: 'active' };
    mockPayment = { id: 'pay-1', status: 'success' };
    getUser.mockResolvedValue(mockUser);
    charge.mockResolvedValue(mockPayment);
  });

  describe('processOrder', () => {
    it('should process order successfully with valid data', async () => {
      const orderData = { userId: '123', items: [{ id: 1, qty: 2 }] };
      const result = await processor.processOrder(orderData);
      
      expect(result.success).toBe(true);
      expect(getUser).toHaveBeenCalledWith('123');
      expect(charge).toHaveBeenCalledWith(expect.objectContaining({
        customerId: '123'
      }));
    });

    it('should throw error when user not found', async () => {
      getUser.mockResolvedValue(null);
      
      await expect(processor.processOrder({ userId: '999' }))
        .rejects.toThrow('User not found');
    });

    it('should retry payment on transient errors', async () => {
      charge
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce(mockPayment);
      
      const result = await processor.processOrder({ userId: '123' });
      
      expect(result.success).toBe(true);
      expect(charge).toHaveBeenCalledTimes(2);
    });
  });
});