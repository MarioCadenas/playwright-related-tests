import { S3Connector } from './s3';
import { EndpointConnector } from './endpoint';

export type TRemoteConnector = S3Connector | EndpointConnector;

export type S3ConnectorParamsOptions = string;

export type EndpointConnectorParamsOptions = {
  url: string;
  method: 'GET' | 'POST' | 'PUT';
  headers: Record<string, string>;
  body?: BodyInit;
};

export type ConnectorOptions =
  | EndpointConnectorParamsOptions
  | S3ConnectorParamsOptions;
