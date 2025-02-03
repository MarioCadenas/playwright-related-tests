import { S3Connector } from './s3';
import { EndpointConnector } from './endpoint';

export type TRemoteConnector = S3Connector | EndpointConnector;
