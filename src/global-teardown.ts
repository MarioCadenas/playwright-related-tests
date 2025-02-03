import { RelationshipManager } from './relationship';
import {
  EndpointConnector,
  S3Connector,
  type TRemoteConnector,
} from './connectors';
import type {
  ConnectorOptions,
  Constructor,
  EndpointConnectorParamsOptions,
  RelationshipType,
  S3ConnectorParamsOptions,
} from './types';
import { logger } from './logger';

export async function upSyncToRemote(
  type: RelationshipType,
  options: EndpointConnectorParamsOptions,
  remoteConnector: Constructor<EndpointConnector>,
): Promise<void>;
export async function upSyncToRemote(
  type: RelationshipType,
  options: S3ConnectorParamsOptions,
  remoteConnector: Constructor<S3Connector>,
): Promise<void>;
export async function upSyncToRemote(
  type: RelationshipType,
  options: ConnectorOptions,
  remoteConnector: Constructor<TRemoteConnector>,
): Promise<void> {
  const relationShipManager = new RelationshipManager([], remoteConnector);

  logger.debug('Upsyncing to remote...');

  await relationShipManager.init({ skipDownload: true });
  await relationShipManager.upsync(type, options);

  logger.debug('Finished upsyncing to remote');
}
