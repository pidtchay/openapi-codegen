import type { Model } from '../../../client/interfaces/Model';
import { getClassName } from '../../../utils/getClassName';
import { getPattern } from '../../../utils/getPattern';
import { OpenAPIV3 } from '../../interfaces/OpenApiTypes';
import { Parser } from '../Parser';
import { escapeName } from './escapeName';
import { getComment } from './getComment';

export function getModelProperties(this: Parser, openApi: OpenAPIV3.Document, definition: OpenAPIV3.SchemaObject, parentRef: string): Model[] {
    const models: Model[] = [];
    for (const propertyName in definition.properties) {
        if (definition.properties.hasOwnProperty(propertyName)) {
            const property = definition.properties[propertyName] as OpenAPIV3.SchemaObject;
            const propertyRequired = definition.required?.includes(propertyName) || property.default !== undefined;

            const model = this.getModel({ openApi: openApi, definition: property, parentRef: parentRef });
            models.push({
                name: escapeName(propertyName),
                alias: model.export === 'enum' ? `${this.context.prefix.enum}${getClassName(escapeName(propertyName))}` : '',
                path: model.path,
                export: model.export,
                type: model.type,
                base: model.base,
                template: model.template,
                link: model.link,
                description: getComment(property.description),
                isDefinition: false,
                isReadOnly: property.readOnly === true,
                isRequired: propertyRequired,
                isNullable: property.nullable === true,
                format: property.format as any,
                maximum: property.maximum,
                exclusiveMaximum: property.exclusiveMaximum,
                minimum: property.minimum,
                exclusiveMinimum: property.exclusiveMinimum,
                multipleOf: property.multipleOf,
                maxLength: property.maxLength,
                minLength: property.minLength,
                maxItems: property.maxItems,
                minItems: property.minItems,
                uniqueItems: property.uniqueItems,
                maxProperties: property.maxProperties,
                minProperties: property.minProperties,
                pattern: getPattern(property.pattern),
                imports: model.imports,
                enum: model.enum,
                enums: model.enums,
                properties: model.properties,
            });
        }
    }

    return models;
}
