import RefParser from 'json-schema-ref-parser';

import { CommonOpenApi } from '../core/CommonOpenApi';
// import { CommonOpenApi } from '../core/CommonOpenApi';
import { Context } from '../core/Context';
import { resolve } from '../core/path';
import { exists } from './fileSystem';

function isObject(object: unknown) {
    return object != null && typeof object === 'object';
}

export function isDeepEqual(obj1: Record<string, any>, obj2: Record<string, any>) {
    const objKeys1 = Object.keys(obj1);
    const objKeys2 = Object.keys(obj2);

    if (objKeys1.length !== objKeys2.length) return false;

    for (const key of objKeys1) {
        const value1 = obj1[key];
        const value2 = obj2[key];

        const isObjects = isObject(value1) && isObject(value2);

        if ((isObjects && !isDeepEqual(value1, value2)) || (!isObjects && value1 !== value2)) {
            return false;
        }
    }
    return true;
}

/**
 * Load and parse te open api spec. If the file extension is ".yml" or ".yaml"
 * we will try to parse the file as a YAML spec, otherwise we will fallback
 * on parsing the file as JSON.
 * @param input
 */
export async function getOpenApiSpec(context: Context, input: string): Promise<any> {
    const absoluteInput = resolve(process.cwd(), input);
    if (!input) {
        throw new Error(`Could not find OpenApi spec: "${absoluteInput}"`);
    }
    const fileExists = await exists(absoluteInput);
    if (!fileExists) {
        throw new Error(`Could not read OpenApi spec: "${absoluteInput}"`);
    }
    const parser = new RefParser();
    await parser.dereference(input);
    context.addRefs(parser.$refs);
    const openApi = { ...parser.schema } as CommonOpenApi;
    const listOfAllRef = Object.entries(context.values());
    const SCHEMA_HTTP_METHODS_ARRAY: string[] = ['get', 'post', 'put', 'delete', 'options', 'head', 'patch', 'trace'];
    listOfAllRef.shift();
    const operationsList = listOfAllRef.filter(([_definitionName, definition]) => Object.keys(definition).some(key => SCHEMA_HTTP_METHODS_ARRAY.includes(key)));
    const newPaths = {};

    for (const [definitionName, definition] of operationsList) {
        for (const [key, pathItem] of Object.entries(openApi.paths)) {
            const isEqual = isDeepEqual(definition, pathItem);

            if (isEqual) {
                Object.assign(newPaths, { [key]: { ...definition, $ref: definitionName } });
            }
        }
    }
    parser.schema = Object.assign(parser.schema, { paths: newPaths });
    return new Promise(resolve => resolve(parser.schema));
}
