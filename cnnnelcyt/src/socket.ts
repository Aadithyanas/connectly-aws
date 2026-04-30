import { Server } from 'socket.io';

// Singleton io instance — set once in index.ts, read anywhere in controllers
let _io: Server | null = null;

export function setIO(io: Server) {
  _io = io;
}

export function getIO(): Server | null {
  return _io;
}
