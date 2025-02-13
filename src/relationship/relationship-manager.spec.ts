import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RelationshipManager } from './relationship-manager';
import { LocalFileSystemConnector, type TRemoteConnector } from '../connectors';

vi.mock('../connectors');

describe('RelationshipManager', () => {
  let relationshipManager: RelationshipManager<TRemoteConnector>;
  const mockFiles = [
    'Component1~Component1.spec.ts Component1 shows basic component when hovering.json',
    'Component2~visual-regression~Component2.spec.ts Component2 Visual regression test - Component2 - Hover - component2-hover - dark.json',
  ];
  const modifiedFiles = [
    'e2e/tests/vrt/Component1.spec.ts',
    'e2e/tests/vrt/Component2.spec.ts',
  ];

  vi.spyOn(LocalFileSystemConnector.prototype, 'getFiles').mockReturnValue(
    mockFiles,
  );

  vi.spyOn(
    LocalFileSystemConnector.prototype,
    'getFileContent',
  ).mockReturnValue(JSON.stringify(['e2e/tests/vrt/Component1.spec.ts']));

  beforeEach(() => {
    relationshipManager = new RelationshipManager(modifiedFiles, undefined);
  });

  it('should collect affected files correctly', () => {
    const { impactedTestFiles, impactedTestNames } =
      relationshipManager.extractRelationships();

    expect(impactedTestFiles).toStrictEqual([
      'Component1/Component1.spec.ts',
      'Component2/visual-regression/Component2.spec.ts',
    ]);
    expect(impactedTestNames).toStrictEqual([
      'Component1/Component1.spec.ts Component1 shows basic component when hovering',
      'Component2/visual-regression/Component2.spec.ts Component2 Visual regression test - Component2 - Hover - component2-hover - dark',
    ]);
  });
});
