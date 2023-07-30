import path from 'path';
import { resolve } from '../core/path';
import { replaceString } from '../core/replaceString';
import { stripNamespace } from './stripNamespace';

/**
 * The function calculates the relative path to the model.
 * Removes the transition to the directory with a level above.
 * @param folderPath Root folder.
 * @param relativeModelPath Relative path to the model.
 * @returns Correct relative model path.
 */
export function getRelativeModelPath(folderPath: string | undefined, relativeModelPath: string) {
    if (!folderPath) {
        return relativeModelPath;
    }
    let mappedPaths = '';
    let modelPath = relativeModelPath;

    if (modelPath.startsWith('/')) {
        modelPath = `..${modelPath}`;
    }

    if (modelPath.startsWith('../')) {
        const pathArray = modelPath.split(path.sep).filter(Boolean);

        while (pathArray[0] === '..') {
            pathArray.shift();
        }

        modelPath = pathArray.join(path.sep);
    }

    const resolvedPath = resolve(folderPath, modelPath);
    if (resolvedPath.startsWith(folderPath)) {
        mappedPaths = modelPath;
    }

    const normalizedValue = replaceString(mappedPaths);
    mappedPaths = stripNamespace(normalizedValue || '');
    return mappedPaths;
}
