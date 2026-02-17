import { MockApiClient } from './adapters/mock';
import type { ApiClient } from './client';

// Switch to real adapter when backend is available:
// import { RealApiClient } from './adapters/real';
// export const apiClient: ApiClient = new RealApiClient();

export const apiClient: ApiClient = new MockApiClient();

// Re-export types for convenience
export type { ApiClient } from './client';
export type { CreateTaskData, UpdateTaskData } from './client';
export * from './types';
