import { RelationshipManager } from './relationship';
import { S3Connector } from './connectors';
import type { RelationshipType } from './types';
import { RELATIONSHIP_TYPES } from './constants';
import { logger } from './logger';

export async function upSyncToRemote(
  type: RelationshipType = RELATIONSHIP_TYPES.MAIN,
  remoteConnector: typeof S3Connector = S3Connector,
) {
  const relationShipManager = new RelationshipManager([], remoteConnector);

  logger.debug('Upsyncing to remote...');

  await relationShipManager.init({ skipDownload: true });
  await relationShipManager.upsync(type);

  logger.debug('Finished upsyncing to remote');
}
