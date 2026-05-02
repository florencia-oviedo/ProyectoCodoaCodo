import { createSchedule, addSessionToSchedule, getSortedSessions, getScheduleSummary, removeSessionFromSchedule } from './scheduleService';

describe('scheduleService', () => {
  it('should create an empty schedule', () => {
    const schedule = createSchedule();
    expect(schedule).toEqual({
      sessions: [],
      createdAt: expect.any(String)
    });
  });

  it('should add a session to the schedule', () => {
    const schedule = createSchedule();
    const result = addSessionToSchedule(schedule, 'My Session', '09:00', '10:00', 'John Doe');
    expect(result).toEqual({
      success: true,
      schedule: {
        sessions: [
          {
            sessionId: expect.stringMatching(/^SESSION-[A-Z0-9]+$/),
            title: 'My Session',
            startTime: '09:00',
            endTime: '10:00',
            speaker: 'John Doe',
            duration: 60
          }
        ],
        createdAt: expect.any(String)
      }
    });
  });

  it('should handle invalid inputs for adding a session', () => {
    const schedule = createSchedule();
    const result1 = addSessionToSchedule(schedule, '', '09:00', '10:00', 'John Doe');
    expect(result1).toEqual({ success: false, error: 'Título de sesión inválido' });

    const result2 = addSessionToSchedule(schedule, 'My Session', '09:00', '10:00', '');
    expect(result2).toEqual({ success: false, error: 'Speaker inválido' });

    const result3 = addSessionToSchedule(schedule, 'My Session', '09:00', '10:00', 'John Doe');
    expect(result3).toEqual({ success: true, schedule });

    const result4 = addSessionToSchedule(schedule, 'My Session', '09:00', '10:00', 'John Doe');
    expect(result4).toEqual({ success: true, schedule });
  });

  it('should sort sessions by start time', () => {
    const schedule = createSchedule();
    const result1 = addSessionToSchedule(schedule, 'Session 1', '09:00', '10:00', 'John Doe');
    const result2 = addSessionToSchedule(schedule, 'Session 2', '08:00', '09:00', 'Jane Smith');
    expect(result1).toEqual({
      success: true,
      schedule: {
        sessions: [
          {
            sessionId: expect.stringMatching(/^SESSION-[A-Z0-9]+$/),
            title: 'Session 1',
            startTime: '09:00',
            endTime: '10:00',
            speaker: 'John Doe',
            duration: 60
          }
        ],
        createdAt: expect.any(String)
      }
    });
    expect(result2).toEqual({
      success: true,
      schedule: {
        sessions: [
          {
            sessionId: expect.stringMatching(/^SESSION-[A-Z0-9]+$/),
            title: 'Session 1',
            startTime: '09:00',
            endTime: '10:00',
            speaker: 'John Doe',
            duration: 60
          },
          {
            sessionId: expect.stringMatching(/^SESSION-[A-Z0-9]+$/),
            title: 'Session 2',
            startTime: '08:00',
            endTime: '09:00',
            speaker: 'Jane Smith',
            duration: 60
          }
        ],
        createdAt: expect.any(String)
      }
    });
    expect(getSortedSessions(result1.schedule)).toEqual([
      {
        sessionId: expect.stringMatching(/^SESSION-[A-Z0-9]+$/),
        title: 'Session 1',
        startTime: '09:00',
        endTime: '10:00',
        speaker: 'John Doe',
        duration: 60
      }
    ]);
    expect(getSortedSessions(result2.schedule)).toEqual([
      {
        sessionId: expect.stringMatching(/^SESSION-[A-Z0-9]+$/),
        title: 'Session 2',
        startTime: '08:00',
        endTime: '09:00',
        speaker: 'Jane Smith',
        duration: 60
      },
      {
        sessionId: expect.stringMatching(/^SESSION-[A-Z0-9]+$/),
        title: 'Session 1',
        startTime: '09:00',
        endTime: '10:00',
        speaker: 'John Doe',
        duration: 60
      }
    ]);
  });

  it('should calculate the duration of a session', () => {
    expect(calculateDuration('09:00', '10:00')).toBe(60);
    expect(calculateDuration('10:00', '11:00')).toBe(60);
    expect(calculateDuration('11:00', '12:00')).toBe(60);
    expect(calculateDuration('12:00', '13:00')).toBe(60);
  });

  it('should calculate the summary of a schedule', () => {
    const schedule = createSchedule();
    const result1 = addSessionToSchedule(schedule, 'Session 1', '09:00', '10:00', 'John Doe');
    const result2 = addSessionToSchedule(schedule, 'Session 2', '08:00', '09:00', 'Jane Smith');
    expect(getScheduleSummary(result1.schedule)).toBe('Horario con 1 sesión(es), duración total 60 minutos.');
    expect(getScheduleSummary(result2.schedule)).toBe('Horario con 2 sesión(es), duración total 120 minutos.');
  });

  it('should remove a session from the schedule', () => {
    const schedule = createSchedule();
    const result1 = addSessionToSchedule(schedule, 'Session 1', '09:00', '10:00', 'John Doe');
    const result2 = addSessionToSchedule(schedule, 'Session 2', '08:00', '09:00', 'Jane Smith');
    const result3 = removeSessionFromSchedule(result2.schedule, 'SESSION-1');
    expect(result3).toEqual({
      success: true,
      schedule: {
        sessions: [
          {
            sessionId: expect.stringMatching(/^SESSION-[A-Z0-9]+$/),
            title: 'Session 2',
            startTime: '08:00',
            endTime: '09:00',
            speaker: 'Jane Smith',
            duration: 60
          }
        ],
        createdAt: expect.any(String)
      }
    });
  });
});
