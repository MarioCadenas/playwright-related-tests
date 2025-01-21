import { RelationshipManager } from './relationship';
import { S3Connector } from './connectors';

export async function upSyncToRemote(
  remoteConnector: typeof S3Connector = S3Connector,
) {
  const relationShipManager = new RelationshipManager([], remoteConnector);

  await relationShipManager.init({ skipDownload: true });
  await relationShipManager.upsync();
}
