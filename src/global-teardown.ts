import { RelationshipManager } from './relationship';
import { S3Connector, type TRemoteConnector } from './connectors';
import type { Constructor, RelationshipType } from './types';
import { RELATIONSHIP_TYPES } from './constants';
import { logger } from './logger';

export async function upSyncToRemote(
  type: RelationshipType = RELATIONSHIP_TYPES.MAIN,
  destination: string,
  remoteConnector: Constructor<TRemoteConnector> = S3Connector,
) {
  const relationShipManager = new RelationshipManager([], remoteConnector);

  logger.debug('Upsyncing to remote...');

  await relationShipManager.init({ skipDownload: true });
  await relationShipManager.upsync(type, destination);

  logger.debug('Finished upsyncing to remote');
}
