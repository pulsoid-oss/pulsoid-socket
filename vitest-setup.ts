import { vi } from 'vitest';

// Make jest-websocket-mock work with Vitest
(globalThis as any).jest = vi;
