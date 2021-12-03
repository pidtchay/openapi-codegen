import type { ModelComposition } from '../../../client/interfaces/ModelComposition';
import { unique } from '../../../utils/unique';
import type { OpenApi } from '../interfaces/OpenApi';
import type { OpenApiSchema } from '../interfaces/OpenApiSchema';
import { Parser } from '../Parser';

export function getModelComposition(
    this: Parser,
    openApi: OpenApi,
    definition: OpenApiSchema,
    definitions: OpenApiSchema[],
    type: 'one-of' | 'any-of' | 'all-of',
    parentRef: string
): ModelComposition {
    const composition: ModelComposition = {
        type,
        imports: [],
        enums: [],
        properties: [],
    };

    const models = definitions.map(definition =>
        this.getModel({
            openApi: openApi,
            definition: definition,
            parentRef: parentRef,
        })
    );
    models
        .filter(model => {
            const hasProperties = model.properties.length;
            const hasEnums = model.enums.length;
            const isObject = model.type === 'any';
            const isEmpty = isObject && !hasProperties && !hasEnums;
            return !isEmpty;
        })
        .forEach(model => {
            composition.imports.push(...model.imports);
            composition.enums.push(...model.enums);
            composition.properties.push(model);
        });

    if (definition.properties) {
        const properties = this.getModelProperties(openApi, definition, parentRef);
        properties.forEach(property => {
            composition.imports.push(...property.imports);
            composition.enums.push(...property.enums);
        });
        composition.properties.push({
            name: 'properties',
            alias: '',
            path: '',
            export: 'interface',
            type: 'any',
            base: 'any',
            template: null,
            link: null,
            description: '',
            isDefinition: false,
            isReadOnly: false,
            isNullable: false,
            isRequired: false,
            imports: [],
            enum: [],
            enums: [],
            properties,
        });
    }
    composition.imports = composition.imports.filter(unique);
    return composition;
}
