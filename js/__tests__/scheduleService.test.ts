import { createSchedule } from '../scheduleService';
import { addSessionToSchedule } from '../scheduleService';
import { getSortedSessions } from '../scheduleService';
import { getScheduleSummary } from '../scheduleService';
import { removeSessionFromSchedule } from '../scheduleService';
import { updateSession } from '../scheduleService';

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
            sessionId: expect.any(String),
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

  it('should sort sessions by start time', () => {
    const schedule = createSchedule();
    const result1 = addSessionToSchedule(schedule, 'Session 1', '09:00', '10:00', 'John Doe');
    const result2 = addSessionToSchedule(result1.schedule, 'Session 2', '08:00', '09:00', 'Jane Smith');
    const result3 = addSessionToSchedule(result2.schedule, 'Session 3', '10:00', '11:00', 'Bob Johnson');
    const sortedSessions = getSortedSessions(result3.schedule);
    expect(sortedSessions).toEqual([
      {
        sessionId: expect.any(String),
        title: 'Session 2',
        startTime: '08:00',
        endTime: '09:00',
        speaker: 'Jane Smith',
        duration: 60
      },
      {
        sessionId: expect.any(String),
        title: 'Session 1',
        startTime: '09:00',
        endTime: '10:00',
        speaker: 'John Doe',
        duration: 60
      },
      {
        sessionId: expect.any(String),
        title: 'Session 3',
        startTime: '10:00',
        endTime: '11:00',
        speaker: 'Bob Johnson',
        duration: 60
      }
    ]);
  });

  it('should calculate the summary of the schedule', () => {
    const schedule = createSchedule();
    const result1 = addSessionToSchedule(schedule, 'Session 1', '09:00', '10:00', 'John Doe');
    const result2 = addSessionToSchedule(result1.schedule, 'Session 2', '08:00', '09:00', 'Jane Smith');
    const result3 = addSessionToSchedule(result2.schedule, 'Session 3', '10:00', '11:00', 'Bob Johnson');
    const summary = getScheduleSummary(result3.schedule);
    expect(summary).toBe('Horario con 3 sesión(es), duración total 180 minutos.');
  });

  it('should remove a session from the schedule', () => {
    const schedule = createSchedule();
    const result1 = addSessionToSchedule(schedule, 'Session 1', '09:00', '10:00', 'John Doe');
    const result2 = addSessionToSchedule(result1.schedule, 'Session 2', '08:00', '09:00', 'Jane Smith');
    const result3 = addSessionToSchedule(result2.schedule, 'Session 3', '10:00', '11:00', 'Bob Johnson');
    const result4 = removeSessionFromSchedule(result3.schedule, 'SESSION-1234567890');
    expect(result4).toEqual({
      success: false,
      error: 'Sesión no encontrada'
    });
  });

  it('should update a session in the schedule', () => {
    const schedule = createSchedule();
    const result1 = addSessionToSchedule(schedule, 'Session 1', '09:00', '10:00', 'John Doe');
    const result2 = addSessionToSchedule(result1.schedule, 'Session 2', '08:00', '09:00', 'Jane Smith');
    const result3 = addSessionToSchedule(result2.schedule, 'Session 3', '10:00', '11:00', 'Bob Johnson');
    const result4 = updateSession(result3.schedule, 'SESSION-1234567890', {
      title: 'Updated Session 1',
      startTime: '08:00',
      endTime: '09:30'
    });
    expect(result4).toEqual({
      success: false,
      error: 'Sesión no encontrada'
    });
  });
});
