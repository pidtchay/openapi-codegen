import equal from 'fast-deep-equal';

import { Context } from '../core/Context';
import { dirName, join } from '../core/path';

enum TypeRef {
    SCHEMA,
    OTHERS,
}

interface IRefWithtype {
    value: string;
    type: TypeRef;
}

function includes(references: IRefWithtype[], value: string): boolean {
    return references.findIndex(item => equal(item.value, value)) !== -1;
}

function isEqualPath(firstPath: string, secondPath: string) {
    const firstPathArr = firstPath.split('/').filter(Boolean);
    const secondPathArr = secondPath.split('/').filter(Boolean);

    return firstPathArr.join('/') === secondPathArr.join('/');
}

function gatheringRefs(context: Context, object: Record<string, any>, references: IRefWithtype[] = [], root: string = '', isSchema: boolean = false): IRefWithtype[] {
    if (object.$ref || isSchema) {
        const newRef = object.$ref.match(/^(http:\/\/|https:\/\/)/g) ? object.$ref : object.$ref.match(/^(#\/)/g) ? join(root, object.$ref) : join(dirName(root), object.$ref);

        if (includes(references, newRef)) {
            return references;
        } else if (isSchema) {
            references.push({ value: newRef, type: TypeRef.SCHEMA });
        } else {
            references.push({ value: newRef, type: TypeRef.OTHERS });
        }
        const all = Object.entries(context.values());

        const findedRefObject = all.find(definitionObject => definitionObject?.[0] && isEqualPath(definitionObject[0], newRef));
        if (findedRefObject?.[0]) {
            const newObject = findedRefObject?.[1] ? context.get(findedRefObject[0]) : findedRefObject[1];
            const newRoot = object.$ref.match(/^(http:\/\/|https:\/\/)/g) ? '' : object.$ref.match(/^(#\/)/g) ? root : join(dirName(root), object.$ref);
            return gatheringRefs(context, newObject as Record<string, any>, references, newRoot, isSchema);
        } else {
            return references;
        }
    } else if (object.schema) {
        Object.values(object).forEach(value => {
            if (value instanceof Object) {
                gatheringRefs(context, value, references, root, true);
            }
        });
    } else {
        Object.values(object).forEach(value => {
            if (value instanceof Object) {
                gatheringRefs(context, value, references, root, isSchema);
            }
        });
    }
    return references;
}

export function getRefFromSchema(context: Context, object: Record<string, any>): string[] {
    const references = gatheringRefs(context, object);
    return references.filter(item => item.type === TypeRef.SCHEMA).map(value => value.value);
}
