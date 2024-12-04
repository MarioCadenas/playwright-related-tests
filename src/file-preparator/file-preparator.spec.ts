import { test, expect, describe } from 'vitest';
import { FilePreparator } from './file-preparator';

const filePreparator = new FilePreparator({
  url: 'https://localhost:1234',
  affectedIgnorePatterns: ['external', 'window'],
});

describe('file-preparator.js', () => {
  describe('outOfProjectFiles', () => {
    test('should filter out files out of the project', () => {
      const files = [
        'webpack/hot-module-replacement',
        '../../some-external-file.js',
        './some-file-in-project.js',
        './folder/file.js',
      ];

      const filteredFiles = files.filter(filePreparator.outOfProjectFiles);

      expect(filteredFiles).toEqual([
        './some-file-in-project.js',
        './folder/file.js',
      ]);
    });

    test('should filter out files or expressions provided in the config', () => {
      const files = [
        'webpack/hot-module-replacement',
        '../../some-external-file.js',
        './some-file-in-project.js',
        './folder/file.js',
        'external var',
        'window',
      ];

      const filteredFiles = files.filter(filePreparator.outOfProjectFiles);

      expect(filteredFiles).toEqual([
        './some-file-in-project.js',
        './folder/file.js',
      ]);
    });
  });

  describe('toGitComparable', () => {
    test('should prepare files to be git comparable ready', () => {
      const files = [
        './some-file-in-project.js',
        './folder/file.js',
        './styles/styles.css',
        './styles/App.css?hash=123hij',
      ];

      const preparedPaths = files.map(filePreparator.toGitComparable);

      expect(preparedPaths).toEqual([
        'some-file-in-project.js',
        'folder/file.js',
        'styles/styles.css',
        'styles/App.css',
      ]);
    });
  });
});
