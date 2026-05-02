import {
  createSchedule,
  addSessionToSchedule,
  getSortedSessions,
  getScheduleSummary,
  removeSessionFromSchedule,
  updateSession
} from '../scheduleService';

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
    const title = 'Session 1';
    const startTime = '10:00';
    const endTime = '11:00';
    const speaker = 'John Doe';

    const result = addSessionToSchedule(schedule, title, startTime, endTime, speaker);
    expect(result).toEqual({
      success: true,
      schedule: {
        sessions: [
          {
            sessionId: expect.stringMatching(/^SESSION-[A-Z0-9]+$/),
            title,
            startTime,
            endTime,
            speaker,
            duration: 60
          }
        ],
        createdAt: expect.any(String)
      }
    });
  });

  it('should not add a session with invalid data', () => {
    const schedule = createSchedule();
    const title = '';
    const startTime = '10:00';
    const endTime = '11:00';
    const speaker = 'John Doe';

    const result = addSessionToSchedule(schedule, title, startTime, endTime, speaker);
    expect(result).toEqual({
      success: false,
      error: 'Título de sesión inválido'
    });
  });

  it('should sort sessions by start time', () => {
    const schedule = createSchedule();
    const sessions = [
      {
        sessionId: 'SESSION-1',
        title: 'Session 1',
        startTime: '10:00',
        endTime: '11:00',
        speaker: 'John Doe',
        duration: 60
      },
      {
        sessionId: 'SESSION-2',
        title: 'Session 2',
        startTime: '09:00',
        endTime: '10:00',
        speaker: 'Jane Smith',
        duration: 60
      }
    ];

    const result = addSessionToSchedule(schedule, sessions[0].title, sessions[0].startTime, sessions[0].endTime, sessions[0].speaker);
    expect(result).toEqual({
      success: true,
      schedule: {
        sessions: [
          sessions[0],
          sessions[1]
        ],
        createdAt: expect.any(String)
      }
    });

    const sortedSessions = getSortedSessions(result.schedule);
    expect(sortedSessions).toEqual([
      sessions[1],
      sessions[0]
    ]);
  });

  it('should calculate the duration of a session', () => {
    const startTime = '10:00';
    const endTime = '11:00';
    const duration = calculateDuration(startTime, endTime);
    expect(duration).toBe(60);
  });

  it('should remove a session from the schedule', () => {
    const schedule = createSchedule();
    const title = 'Session 1';
    const startTime = '10:00';
    const endTime = '11:00';
    const speaker = 'John Doe';

    const addResult = addSessionToSchedule(schedule, title, startTime, endTime, speaker);
    expect(addResult).toEqual({
      success: true,
      schedule: {
        sessions: [
          {
            sessionId: expect.stringMatching(/^SESSION-[A-Z0-9]+$/),
            title,
            startTime,
            endTime,
            speaker,
            duration: 60
          }
        ],
        createdAt: expect.any(String)
      }
    });

    const removeResult = removeSessionFromSchedule(addResult.schedule, addResult.schedule.sessions[0].sessionId);
    expect(removeResult).toEqual({
      success: true,
      schedule: {
        sessions: [],
        createdAt: expect.any(String)
      }
    });
  });

  it('should update a session in the schedule', () => {
    const schedule = createSchedule();
    const title = 'Session 1';
    const startTime = '10:00';
    const endTime = '11:00';
    const speaker = 'John Doe';

    const addResult = addSessionToSchedule(schedule, title, startTime, endTime, speaker);
    expect(addResult).toEqual({
      success: true,
      schedule: {
        sessions: [
          {
            sessionId: expect.stringMatching(/^SESSION-[A-Z0-9]+$/),
            title,
            startTime,
            endTime,
            speaker,
            duration: 60
          }
        ],
        createdAt: expect.any(String)
      }
    });

    const updates = {
      title: 'Updated Title',
      startTime: '11:00',
      endTime: '12:00'
    };

    const updateResult = updateSession(addResult.schedule, addResult.schedule.sessions[0].sessionId, updates);
    expect(updateResult).toEqual({
      success: true,
      schedule: {
        sessions: [
          {
            sessionId: expect.stringMatching(/^SESSION-[A-Z0-9]+$/),
            title: updates.title,
            startTime: updates.startTime,
            endTime: updates.endTime,
            speaker,
            duration: 60
          }
        ],
        createdAt: expect.any(String)
      }
    });
  });
});
