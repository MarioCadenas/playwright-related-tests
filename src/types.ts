import type { RELATIONSHIP_TYPES } from './constants';

export type RelationshipType =
  (typeof RELATIONSHIP_TYPES)[keyof typeof RELATIONSHIP_TYPES];

export type S3ConnectorParamsOptions = string;

export type EndpointConnectorParamsOptions = {
  url: string;
  method: 'GET' | 'POST' | 'PUT';
  headers: Record<string, string>;
  body?: BodyInit;
};

export type ConnectorOptions = EndpointConnectorParamsOptions | string;

export type Constructor<T> = new (...args: any[]) => T;
