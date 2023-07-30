import type { OperationParameter } from '../../../client/interfaces/OperationParameter';
import { getPattern } from '../../../utils/getPattern';
import { OpenAPIV3 } from '../../interfaces/OpenApiTypes';
import { Parser } from '../Parser';
import { getComment } from './getComment';
import { getOperationParameterName } from './getOperationParameterName';

export function getOperationParameter(this: Parser, openApi: OpenAPIV3.Document, parameter: OpenAPIV3.ParameterObject): OperationParameter {
    const operationParameter: OperationParameter = {
        in: parameter.in as any,
        prop: parameter.name,
        export: 'interface',
        name: getOperationParameterName(parameter.name),
        alias: '',
        path: '',
        type: 'any',
        base: 'any',
        template: null,
        link: null,
        description: getComment(parameter.description),
        isDefinition: false,
        isReadOnly: false,
        isRequired: parameter.required === true,
        isNullable: false,
        imports: [],
        enum: [],
        enums: [],
        properties: [],
        mediaType: null,
    };

    if (parameter.schema) {
        const model = this.getModel({ openApi: openApi, definition: parameter.schema as OpenAPIV3.SchemaObject, parentRef: '' });
        operationParameter.export = model.export;
        operationParameter.type = model.type;
        operationParameter.base = model.base;
        operationParameter.template = model.template;
        operationParameter.link = model.link;
        operationParameter.isReadOnly = model.isReadOnly;
        operationParameter.isRequired = operationParameter.isRequired || model.isRequired;
        operationParameter.isNullable = operationParameter.isNullable || model.isNullable;
        operationParameter.format = model.format;
        operationParameter.maximum = model.maximum;
        operationParameter.exclusiveMaximum = model.exclusiveMaximum;
        operationParameter.minimum = model.minimum;
        operationParameter.exclusiveMinimum = model.exclusiveMinimum;
        operationParameter.multipleOf = model.multipleOf;
        operationParameter.maxLength = model.maxLength;
        operationParameter.minLength = model.minLength;
        operationParameter.maxItems = model.maxItems;
        operationParameter.minItems = model.minItems;
        operationParameter.uniqueItems = model.uniqueItems;
        operationParameter.maxProperties = model.maxProperties;
        operationParameter.minProperties = model.minProperties;
        operationParameter.pattern = getPattern(model.pattern);
        operationParameter.default = model.default;
        operationParameter.imports.push(...model.imports);
        operationParameter.enum.push(...model.enum);
        operationParameter.enums.push(...model.enums);
        operationParameter.properties.push(...model.properties);
        return operationParameter;
    }

    return operationParameter;
}
