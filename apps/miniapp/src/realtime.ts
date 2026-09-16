import type { Command, MatchSnapshot, ServerEvent } from '@undergammon/protocol';

export type MatchControlState = 'requesting' | 'owned' | 'lost';

export function connectMatch(
  matchId: string,
  receive: (event: ServerEvent) => void,
  status: (online: boolean) => void,
  controlStatus: (state: MatchControlState) => void,
) {
  let socket: WebSocket;
  let stopped = false;
  let delay = 500;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let version = 0;
  let controlIntent = true;
  let controlState: MatchControlState = 'requesting';
  let pendingOpenCommandId: string | null = null;

  const setControlState = (next: MatchControlState) => {
    if (controlState === next) return;
    controlState = next;
    controlStatus(next);
  };

  const transmit = (type: Command['type'], fields: Partial<Command> = {}) => {
    if (socket?.readyState !== WebSocket.OPEN) return null;
    const commandId = crypto.randomUUID();
    socket.send(
      JSON.stringify({
        protocolVersion: 1,
        commandId,
        matchId,
        stateVersion: version,
        type,
        ...fields,
      }),
    );
    return commandId;
  };

  const requestControl = () => {
    if (socket?.readyState !== WebSocket.OPEN) return false;
    const commandId = transmit('OPEN');
    if (!commandId) return false;
    controlIntent = true;
    pendingOpenCommandId = commandId;
    setControlState('requesting');
    return true;
  };

  const open = () => {
    socket = new WebSocket(
      `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`,
    );
    socket.onopen = () => {
      delay = 500;
      status(true);
      if (controlIntent) requestControl();
    };
    socket.onmessage = (event) => {
      const data = JSON.parse(String(event.data)) as ServerEvent;
      if (data.type === 'SNAPSHOT') {
        version = Math.max(version, data.snapshot.stateVersion);
        if (pendingOpenCommandId && data.commandId === pendingOpenCommandId) {
          pendingOpenCommandId = null;
          setControlState('owned');
        }
      }
      if (data.type === 'CONTROL_LOST' || (data.type === 'ERROR' && data.code === 'CONTROL_LOST')) {
        controlIntent = false;
        pendingOpenCommandId = null;
        setControlState('lost');
      } else if (data.type === 'ERROR' && controlState === 'requesting') {
        controlIntent = false;
        pendingOpenCommandId = null;
        setControlState('lost');
      }
      receive(data);
    };
    socket.onclose = () => {
      status(false);
      pendingOpenCommandId = null;
      if (!stopped) {
        timer = setTimeout(open, delay);
        delay = Math.min(delay * 2, 10000);
      }
    };
    socket.onerror = () => socket.close();
  };

  const send = (type: Command['type'], fields: Partial<Command> = {}) => {
    if (type === 'OPEN') return requestControl();
    return transmit(type, fields) !== null;
  };

  open();
  return {
    send,
    requestControl,
    close: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      socket.close();
    },
    version: (s: MatchSnapshot) => {
      version = Math.max(version, s.stateVersion);
    },
  };
}
