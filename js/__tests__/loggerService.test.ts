import { setLogLevel, debug, info, warn, error, getLogs, clearLogs, getLogsByLevel, LOG_LEVELS } from '../loggerService';

describe('loggerService', () => {
  beforeEach(() => {
    clearLogs();
  });

  it('should log messages based on the set log level', () => {
    setLogLevel('DEBUG');
    debug('Debug message');
    expect(getLogs()).toHaveLength(1);

    setLogLevel('INFO');
    clearLogs();
    debug('Debug message');
    expect(getLogs()).toHaveLength(0);

    setLogLevel('WARN');
    clearLogs();
    debug('Debug message');
    expect(getLogs()).toHaveLength(0);

    setLogLevel('ERROR');
    clearLogs();
    debug('Debug message');
    expect(getLogs()).toHaveLength(0);
  });

  it('should log messages with correct level and data', () => {
    setLogLevel('DEBUG');
    debug('Debug message', { foo: 'bar' });
    expect(getLogs()).toEqual([
      {
        timestamp: expect.any(String),
        level: 'DEBUG',
        message: 'Debug message',
        data: { foo: 'bar' }
      }
    ]);
  });

  it('should not log messages below the set log level', () => {
    setLogLevel('WARN');
    info('Info message');
    expect(getLogs()).toHaveLength(0);

    setLogLevel('ERROR');
    info('Info message');
    expect(getLogs()).toHaveLength(0);
  });

  it('should log messages in the correct order', () => {
    setLogLevel('DEBUG');
    debug('Debug message 1');
    debug('Debug message 2');
    expect(getLogs()).toEqual([
      {
        timestamp: expect.any(String),
        level: 'DEBUG',
        message: 'Debug message 1',
        data: null
      },
      {
        timestamp: expect.any(String),
        level: 'DEBUG',
        message: 'Debug message 2',
        data: null
      }
    ]);
  });

  it('should log messages to the console', () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    setLogLevel('DEBUG');
    debug('Debug message');
    expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] Debug message', null);
    consoleSpy.mockRestore();
  });

  it('should handle invalid log levels', () => {
    // Since currentLogLevel is not exported, we can't test it directly
    // Instead, test that invalid level doesn't change behavior
    setLogLevel('DEBUG');
    debug('Debug message');
    expect(getLogs()).toHaveLength(1);

    setLogLevel('INVALID');
    clearLogs();
    debug('Debug message');
    expect(getLogs()).toHaveLength(1); // Should still log since level didn't change
  });

  it('should clear all logs', () => {
    setLogLevel('DEBUG');
    debug('Debug message');
    expect(getLogs()).toHaveLength(1);
    clearLogs();
    expect(getLogs()).toHaveLength(0);
  });

  it('should filter logs by level', () => {
    setLogLevel('DEBUG');
    debug('Debug message');
    info('Info message');
    warn('Warning message');
    error('Error message');
    expect(getLogsByLevel('DEBUG')).toEqual([
      {
        timestamp: expect.any(String),
        level: 'DEBUG',
        message: 'Debug message',
        data: null
      }
    ]);
    expect(getLogsByLevel('INFO')).toEqual([
      {
        timestamp: expect.any(String),
        level: 'INFO',
        message: 'Info message',
        data: null
      }
    ]);
    expect(getLogsByLevel('WARN')).toEqual([
      {
        timestamp: expect.any(String),
        level: 'WARN',
        message: 'Warning message',
        data: null
      }
    ]);
    expect(getLogsByLevel('ERROR')).toEqual([
      {
        timestamp: expect.any(String),
        level: 'ERROR',
        message: 'Error message',
        data: null
      }
    ]);
  });
});
