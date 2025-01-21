import { RelatedTestsConfig } from './config';
import { RELATIONSHIP_TYPES } from './constants';
import type { RelationshipType } from './types';

export async function syncRemoteFiles(
  type: RelationshipType = RELATIONSHIP_TYPES.MAIN,
) {
  await RelatedTestsConfig.instance.syncRemote(type);
}
