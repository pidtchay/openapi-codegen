import { Model } from '../../../client/interfaces/Model';
import type { OperationResponse } from '../../../client/interfaces/OperationResponse';
import { getPattern } from '../../../utils/getPattern';
import { OpenAPIV3 } from '../../interfaces/OpenApiTypes';
import { Parser } from '../Parser';
import { getComment } from './getComment';
import { getContent } from './getContent';

export function getOperationResponse(this: Parser, openApi: OpenAPIV3.Document, response: OpenAPIV3.ResponseObject, responseCode: number, parentRef: string, models: Model[]): OperationResponse {
    const operationResponse: OperationResponse = {
        in: 'response',
        name: '',
        alias: '',
        path: '',
        code: responseCode,
        description: getComment(response.description)!,
        export: 'generic',
        type: 'any',
        base: 'any',
        template: null,
        link: null,
        isDefinition: false,
        isReadOnly: false,
        isRequired: false,
        isNullable: false,
        imports: [],
        enum: [],
        enums: [],
        properties: [],
    };

    if (response.content) {
        const schema = getContent(response.content);
        if (schema) {
            const model = this.getModel({ openApi: openApi, definition: schema, parentRef: parentRef });
            const existedModel = models.find(it => (it?.alias === model?.alias || it.name === model?.name) && it.type === model?.type);
            if (existedModel) {
                operationResponse.export = 'reference';
                operationResponse.type = existedModel.type;
                operationResponse.base = existedModel.base;
                operationResponse.path = existedModel.path;
                operationResponse.template = existedModel.template;
                operationResponse.imports.push(...existedModel.imports);
                return operationResponse;
            } else {
                operationResponse.export = model.export;
                operationResponse.type = model.type;
                operationResponse.base = model.base;
                operationResponse.path = model.path;
                operationResponse.template = model.template;
                operationResponse.link = model.link;
                operationResponse.isReadOnly = model.isReadOnly;
                operationResponse.isRequired = model.isRequired;
                operationResponse.isNullable = model.isNullable;
                operationResponse.format = model.format;
                operationResponse.maximum = model.maximum;
                operationResponse.exclusiveMaximum = model.exclusiveMaximum;
                operationResponse.minimum = model.minimum;
                operationResponse.exclusiveMinimum = model.exclusiveMinimum;
                operationResponse.multipleOf = model.multipleOf;
                operationResponse.maxLength = model.maxLength;
                operationResponse.minLength = model.minLength;
                operationResponse.maxItems = model.maxItems;
                operationResponse.minItems = model.minItems;
                operationResponse.uniqueItems = model.uniqueItems;
                operationResponse.maxProperties = model.maxProperties;
                operationResponse.minProperties = model.minProperties;
                operationResponse.pattern = getPattern(model.pattern);
                operationResponse.imports.push(...model.imports);
                operationResponse.enum.push(...model.enum);
                operationResponse.enums.push(...model.enums);
                operationResponse.properties.push(...model.properties);
                return operationResponse;
            }
        }
    }

    // We support basic properties from response headers, since both
    // fetch and XHR client just support string types.
    if (response.headers) {
        for (const name in response.headers) {
            if (response.headers.hasOwnProperty(name)) {
                operationResponse.in = 'header';
                operationResponse.name = name;
                operationResponse.type = 'string';
                operationResponse.base = 'string';
                return operationResponse;
            }
        }
    }

    return operationResponse;
}
