import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const io = vi.fn();
vi.mock('socket.io-client', () => ({ io: (...a) => io(...a) }));

/**
 * The single socket.io connection the control app keeps open for notifications.
 *
 * The module holds one socket in a module-level variable, so every test here
 * re-imports it through `load()` after `vi.resetModules()` — otherwise a socket
 * left connected by one test decides what the next one sees. The server origin
 * is derived from VITE_API_URL at import time, which is why the "no API URL"
 * case has to stub the env before the import rather than inside the test body.
 */

// A stand-in for the socket.io client: only the handful of members the service
// touches, plus a record of the listeners it registered so they can be fired.
const makeSocket = (connected = false) => {
  const handlers = {};
  return {
    connected,
    handlers,
    on: vi.fn((event, cb) => {
      handlers[event] = cb;
    }),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
};

const load = async () => {
  vi.resetModules();
  return import('../api/socketService');
};

beforeEach(() => {
  vi.clearAllMocks();
  io.mockImplementation(() => makeSocket());
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('connecting', () => {
  it('connects to the server origin, dropping the REST path', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/api/v1');
    const { connectSocket } = await load();

    connectSocket({ accessToken: 'at', userId: 'u1', tenantId: 't1' });

    const [url, options] = io.mock.calls[0];
    expect(url).toBe('https://api.example.com');
    expect(options.auth).toEqual({ token: 'at' });
    expect(options.query).toEqual({ userId: 'u1', tenantId: 't1' });
  });

  it('never gives up reconnecting, so a backgrounded tab recovers', async () => {
    const { connectSocket } = await load();
    connectSocket({ accessToken: 'at', userId: 'u1', tenantId: 't1' });
    expect(io.mock.calls[0][1].reconnectionAttempts).toBe(Infinity);
  });

  it('refuses to connect when no API URL is configured', async () => {
    vi.stubEnv('VITE_API_URL', '');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { connectSocket } = await load();

    expect(connectSocket({ accessToken: 'at' })).toBeNull();
    expect(io).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('reuses a socket that is already connected', async () => {
    const { connectSocket } = await load();
    const first = connectSocket({ accessToken: 'at' });
    first.connected = true;

    expect(connectSocket({ accessToken: 'at' })).toBe(first);
    expect(io).toHaveBeenCalledTimes(1);
  });

  it('opens a fresh socket when the previous one has dropped', async () => {
    const { connectSocket } = await load();
    connectSocket({ accessToken: 'at' });
    connectSocket({ accessToken: 'at' });
    expect(io).toHaveBeenCalledTimes(2);
  });

  it('logs a connection error and a failed reconnection', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { connectSocket } = await load();
    const socket = connectSocket({ accessToken: 'at' });

    socket.handlers.connect_error({ message: 'refused' });
    socket.handlers.reconnect_failed();

    expect(error).toHaveBeenCalledWith('[Socket] Connection error:', 'refused');
    expect(error).toHaveBeenCalledWith('[Socket] Reconnection failed after max attempts');
    error.mockRestore();
  });
});

describe('registering the user', () => {
  it('announces the admin to the server', async () => {
    const { connectSocket, registerUser } = await load();
    const socket = connectSocket({ accessToken: 'at' });

    registerUser({ userId: 'u1', userType: 'ADMIN' });
    expect(socket.emit).toHaveBeenCalledWith('register', { userId: 'u1', userType: 'ADMIN' });
  });

  it('does nothing when there is no socket yet', async () => {
    const { registerUser } = await load();
    expect(() => registerUser({ userId: 'u1', userType: 'ADMIN' })).not.toThrow();
  });
});

describe('disconnecting', () => {
  it('disconnects and forgets the socket', async () => {
    const { connectSocket, disconnectSocket, getSocket } = await load();
    const socket = connectSocket({ accessToken: 'at' });

    disconnectSocket();
    expect(socket.disconnect).toHaveBeenCalled();
    expect(getSocket()).toBeNull();
  });

  it('is safe to call when nothing is connected', async () => {
    const { disconnectSocket, getSocket } = await load();
    disconnectSocket();
    expect(getSocket()).toBeNull();
  });
});

describe('nudging a dropped socket', () => {
  it('reconnects a socket that is no longer connected', async () => {
    const { connectSocket, ensureConnected } = await load();
    const socket = connectSocket({ accessToken: 'at' });

    expect(ensureConnected()).toBe(socket);
    expect(socket.connect).toHaveBeenCalled();
  });

  it('leaves a live socket alone', async () => {
    const { connectSocket, ensureConnected } = await load();
    const socket = connectSocket({ accessToken: 'at' });
    socket.connected = true;

    ensureConnected();
    expect(socket.connect).not.toHaveBeenCalled();
  });

  it('returns null when there is nothing to reconnect', async () => {
    const { ensureConnected } = await load();
    expect(ensureConnected()).toBeNull();
  });
});

describe('notifications', () => {
  it('subscribes and hands back an unsubscribe', async () => {
    const { connectSocket, onNotification } = await load();
    const socket = connectSocket({ accessToken: 'at' });
    const callback = vi.fn();

    const unsubscribe = onNotification(callback);
    expect(socket.on).toHaveBeenCalledWith('newNotification', callback);

    unsubscribe();
    expect(socket.off).toHaveBeenCalledWith('newNotification', callback);
  });

  it('unsubscribes from the socket it subscribed to, not the current one', async () => {
    const { connectSocket, disconnectSocket, onNotification } = await load();
    const socket = connectSocket({ accessToken: 'at' });
    const callback = vi.fn();
    const unsubscribe = onNotification(callback);

    // A logout between subscribe and unsubscribe nulls the module's socket;
    // the closure must still reach the original one.
    disconnectSocket();
    expect(() => unsubscribe()).not.toThrow();
    expect(socket.off).toHaveBeenCalledWith('newNotification', callback);
  });

  it('hands back a no-op unsubscribe when there is no socket', async () => {
    const { onNotification } = await load();
    const unsubscribe = onNotification(vi.fn());
    expect(() => unsubscribe()).not.toThrow();
  });

  it('marks a notification read over a live socket', async () => {
    const { connectSocket, emitNotificationRead } = await load();
    const socket = connectSocket({ accessToken: 'at' });
    socket.connected = true;

    emitNotificationRead('n1');
    expect(socket.emit).toHaveBeenCalledWith('notificationRead', { notificationId: 'n1' });
  });

  it('drops a read receipt while the socket is down', async () => {
    const { connectSocket, emitNotificationRead } = await load();
    const socket = connectSocket({ accessToken: 'at' });

    emitNotificationRead('n1');
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it('drops a read receipt when there is no socket at all', async () => {
    const { emitNotificationRead } = await load();
    expect(() => emitNotificationRead('n1')).not.toThrow();
  });
});

describe('the default export', () => {
  it('carries the functions the layout imports as one object', async () => {
    const service = (await load()).default;
    expect(Object.keys(service).sort()).toEqual([
      'connectSocket',
      'disconnectSocket',
      'emitNotificationRead',
      'getSocket',
      'onNotification',
      'registerUser',
    ]);
  });
});
