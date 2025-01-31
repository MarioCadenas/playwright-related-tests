import type { RELATIONSHIP_TYPES } from './constants';

export type RelationshipType =
  (typeof RELATIONSHIP_TYPES)[keyof typeof RELATIONSHIP_TYPES];

export type Constructor<T> = new (...args: any[]) => T;
