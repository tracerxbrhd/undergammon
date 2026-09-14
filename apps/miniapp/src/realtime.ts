import type { Command, MatchSnapshot, ServerEvent } from '@undergammon/protocol';
export function connectMatch(
  matchId: string,
  receive: (event: ServerEvent) => void,
  status: (online: boolean) => void,
) {
  let socket: WebSocket;
  let stopped = false;
  let delay = 500;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let version = 0;
  let owns = true;
  const open = () => {
    socket = new WebSocket(
      `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`,
    );
    socket.onopen = () => {
      delay = 500;
      status(true);
      if (owns) send('OPEN');
    };
    socket.onmessage = (event) => {
      const data = JSON.parse(String(event.data)) as ServerEvent;
      if (data.type === 'SNAPSHOT') version = Math.max(version, data.snapshot.stateVersion);
      if (data.type === 'CONTROL_LOST') owns = false;
      receive(data);
    };
    socket.onclose = () => {
      status(false);
      if (!stopped) {
        timer = setTimeout(open, delay);
        delay = Math.min(delay * 2, 10000);
      }
    };
    socket.onerror = () => socket.close();
  };
  const send = (type: Command['type'], fields: Partial<Command> = {}) => {
    if (socket?.readyState !== WebSocket.OPEN) return;
    if (type === 'OPEN') owns = true;
    socket.send(
      JSON.stringify({
        protocolVersion: 1,
        commandId: crypto.randomUUID(),
        matchId,
        stateVersion: version,
        type,
        ...fields,
      }),
    );
  };
  open();
  return {
    send,
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
