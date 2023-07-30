import type { Model } from '../../../client/interfaces/Model';
import { getPattern } from '../../../utils/getPattern';
import { OpenAPIV3 } from '../../interfaces/OpenApiTypes';
import { ModelConfig } from '../interfaces/ModelConfig';
import { Parser } from '../Parser';
import { getComment } from './getComment';
import { getEnum } from './getEnum';
import { getEnumFromDescription } from './getEnumFromDescription';
import { getModelDefault } from './getModelDefault';

export function getModel(this: Parser, config: ModelConfig): Model {
    const { openApi, definition, isDefinition = false, name = '', path = '', parentRef } = config;
    const model: Model = {
        name,
        alias: '',
        path,
        export: 'interface',
        type: 'any',
        base: 'any',
        link: null,
        template: null,
        description: getComment(definition.description),
        isDefinition,
        isReadOnly: definition.readOnly === true,
        isNullable: definition.nullable === true,
        isRequired: definition.default !== undefined,
        format: definition.format as any,
        maximum: definition.maximum,
        exclusiveMaximum: definition.exclusiveMaximum,
        minimum: definition.minimum,
        exclusiveMinimum: definition.exclusiveMinimum,
        multipleOf: definition.multipleOf,
        maxLength: definition.maxLength,
        minLength: definition.minLength,
        maxItems: definition.maxItems,
        minItems: definition.minItems,
        uniqueItems: definition.uniqueItems,
        maxProperties: definition.maxProperties,
        minProperties: definition.minProperties,
        pattern: getPattern(definition.pattern),
        imports: [],
        enum: [],
        enums: [],
        properties: [],
    };

    if (definition.enum && definition.type !== 'boolean') {
        const enumerators = getEnum(definition.enum);
        if (enumerators.length) {
            model.export = 'enum';
            model.type = 'string';
            model.base = 'string';
            model.enum.push(...enumerators);
            model.default = getModelDefault(definition, model);
            return model;
        }
    }

    if ((definition.type === 'number' || definition.type === 'integer') && definition.description) {
        const enumerators = getEnumFromDescription(definition.description);
        if (enumerators.length) {
            model.export = 'enum';
            model.type = 'number';
            model.base = 'number';
            model.enum.push(...enumerators);
            model.default = getModelDefault(definition, model);
            return model;
        }
    }

    if (definition.type === 'array' && definition.items) {
        const arrayItemsType = this.getType(parentRef, definition);
        const arrayItems = this.getModel({ openApi: openApi, definition: definition.items as OpenAPIV3.SchemaObject, parentRef: parentRef });
        model.export = 'array';
        model.type = arrayItems.type;
        model.base = arrayItems.base;
        model.link = arrayItems;
        model.imports.push(...arrayItems.imports);
        model.default = getModelDefault(definition, model);
        return model;
    }

    if (definition.type === 'object' && typeof definition.additionalProperties === 'object') {
        const additionalProperties = this.getModel({
            openApi: openApi,
            definition: definition.additionalProperties as OpenAPIV3.SchemaObject,
            parentRef: parentRef,
        });
        model.export = 'dictionary';
        model.type = additionalProperties.type;
        model.base = additionalProperties.base;
        model.link = additionalProperties;
        model.imports.push(...additionalProperties.imports);
        model.default = getModelDefault(definition, model);
        return model;
    }

    const oneOfArray = definition?.oneOf ? (definition.oneOf as OpenAPIV3.SchemaObject[]) : [];
    if (oneOfArray.length) {
        const composition = this.getModelComposition(openApi, definition, oneOfArray, 'one-of', parentRef);
        model.export = composition.type;
        model.imports.push(...composition.imports);
        model.properties.push(...composition.properties);
        model.enums.push(...composition.enums);
        return model;
    }

    const anyOfArray = definition?.anyOf ? (definition.anyOf as OpenAPIV3.SchemaObject[]) : [];
    if (anyOfArray.length) {
        const composition = this.getModelComposition(openApi, definition, anyOfArray, 'any-of', parentRef);
        model.export = composition.type;
        model.imports.push(...composition.imports);
        model.properties.push(...composition.properties);
        model.enums.push(...composition.enums);
        return model;
    }

    const allOfArray = definition?.allOf ? (definition.allOf as OpenAPIV3.SchemaObject[]) : [];
    if (allOfArray.length) {
        const composition = this.getModelComposition(openApi, definition, allOfArray, 'all-of', parentRef);
        model.export = composition.type;
        model.imports.push(...composition.imports);
        model.properties.push(...composition.properties);
        model.enums.push(...composition.enums);
        return model;
    }

    if (definition.type === 'object') {
        model.export = 'interface';
        model.type = 'any';
        model.base = 'any';
        model.default = getModelDefault(definition, model);

        if (definition.properties) {
            const properties = this.getModelProperties(openApi, definition, parentRef);
            properties.forEach(property => {
                model.imports.push(...property.imports);
                model.enums.push(...property.enums);
                model.properties.push(property);
                if (property.export === 'enum') {
                    model.enums.push(property);
                }
            });
        }
        return model;
    }

    // If the schema has a type than it can be a basic or generic type.
    if (definition.type) {
        const definitionType = this.getType(definition.type);
        model.export = 'generic';
        model.type = definitionType.type;
        model.base = definitionType.base;
        model.imports.push(...definitionType.imports);
        model.default = getModelDefault(definition, model);
        return model;
    }

    return model;
}
