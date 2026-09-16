import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectMatch, type MatchControlState } from '../src/realtime';

class FakeWebSocket {
  static readonly OPEN = 1;
  static readonly CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  message(value: unknown) {
    this.onmessage?.({ data: JSON.stringify(value) });
  }

  close() {
    if (this.readyState === FakeWebSocket.CLOSED) return;
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }

  send(value: string) {
    this.sent.push(value);
  }
}

const matchId = '11111111-1111-4111-8111-111111111111';
const originalWebSocket = Object.getOwnPropertyDescriptor(
  globalThis,
  'WebSocket',
);
const originalLocation = Object.getOwnPropertyDescriptor(
  globalThis,
  'location',
);

function restoreGlobal(
  name: 'WebSocket' | 'location',
  descriptor?: PropertyDescriptor,
) {
  if (descriptor) Object.defineProperty(globalThis, name, descriptor);
  else Reflect.deleteProperty(globalThis, name);
}

function snapshot(commandId?: string) {
  return {
    protocolVersion: 1,
    type: 'SNAPSHOT',
    snapshot: { stateVersion: 1 },
    serverTime: Date.now(),
    ...(commandId ? { commandId } : {}),
  };
}

function commandId(socket: FakeWebSocket, index = socket.sent.length - 1) {
  return (JSON.parse(socket.sent[index] ?? '{}') as { commandId?: string })
    .commandId;
}

describe('connectMatch session control', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    Object.defineProperty(globalThis, 'WebSocket', {
      configurable: true,
      value: FakeWebSocket,
    });
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: { protocol: 'https:', host: 'undergammon.test' },
    });
  });

  afterEach(() => {
    restoreGlobal('WebSocket', originalWebSocket);
    restoreGlobal('location', originalLocation);
    vi.useRealTimers();
  });

  it(
    'marks control owned only after the matching OPEN snapshot acknowledgement',
    () => {
      const controlStates: MatchControlState[] = [];
      const connection = connectMatch(
        matchId,
        () => undefined,
        () => undefined,
        (state) => {
          controlStates.push(state);
        },
      );
      const socket = FakeWebSocket.instances[0]!;

      socket.open();
      const initialOpen = commandId(socket);
      expect(initialOpen).toBeTruthy();
      expect(controlStates).toEqual([]);

      socket.message(snapshot('22222222-2222-4222-8222-222222222222'));
      expect(controlStates).toEqual([]);

      socket.message(snapshot(initialOpen));
      expect(controlStates).toEqual(['owned']);

      socket.message({ protocolVersion: 1, type: 'CONTROL_LOST' });
      expect(controlStates).toEqual(['owned', 'lost']);

      expect(connection.requestControl()).toBe(true);
      expect(controlStates).toEqual(['owned', 'lost', 'requesting']);
      const takeoverOpen = commandId(socket);
      socket.message(snapshot(takeoverOpen));
      expect(controlStates).toEqual(['owned', 'lost', 'requesting', 'owned']);

      connection.close();
    },
  );

  it(
    'refuses offline takeover and retries an interrupted takeover after reconnect',
    () => {
      const controlStates: MatchControlState[] = [];
      const connection = connectMatch(
        matchId,
        () => undefined,
        () => undefined,
        (state) => {
          controlStates.push(state);
        },
      );
      const first = FakeWebSocket.instances[0]!;

      first.open();
      first.message(snapshot(commandId(first)));
      first.message({ protocolVersion: 1, type: 'CONTROL_LOST' });
      first.close();

      expect(connection.requestControl()).toBe(false);
      expect(controlStates.at(-1)).toBe('lost');

      vi.advanceTimersByTime(500);
      const second = FakeWebSocket.instances[1]!;
      second.open();
      expect(second.sent).toHaveLength(0);

      expect(connection.requestControl()).toBe(true);
      expect(controlStates.at(-1)).toBe('requesting');
      expect(second.sent).toHaveLength(1);
      second.close();

      vi.advanceTimersByTime(500);
      const third = FakeWebSocket.instances[2]!;
      third.open();
      expect(third.sent).toHaveLength(1);
      third.message(snapshot(commandId(third)));
      expect(controlStates.at(-1)).toBe('owned');

      connection.close();
    },
  );
});
