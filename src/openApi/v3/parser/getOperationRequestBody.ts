import { Model } from '../../../client/interfaces/Model';
import type { OperationParameter } from '../../../client/interfaces/OperationParameter';
import { isDeepEqual } from '../../../utils/getOpenApiSpec';
import { getPattern } from '../../../utils/getPattern';
import { OpenAPIV3 } from '../../interfaces/OpenApiTypes';
import { Parser } from '../Parser';
import { getComment } from './getComment';
import { getContent } from './getContent';
import { getMediaType } from './getMediaType';

export function getOperationRequestBody(this: Parser, openApi: OpenAPIV3.Document, requestBodyDef: OpenAPIV3.RequestBodyObject, models: Model[], parentRef = ''): OperationParameter {
    const requestBody: OperationParameter = {
        in: 'body',
        prop: 'body',
        export: 'interface',
        name: 'requestBody',
        alias: '',
        path: '',
        type: 'any',
        base: 'any',
        template: null,
        link: null,
        description: getComment(requestBodyDef.description),
        default: undefined,
        isDefinition: false,
        isReadOnly: false,
        isRequired: requestBodyDef.required === true,
        isNullable: false,
        imports: [],
        enum: [],
        enums: [],
        properties: [],
        mediaType: null,
    };

    if (requestBodyDef.content) {
        const schema = getContent(requestBodyDef.content);
        if (schema) {
            requestBody.mediaType = getMediaType(requestBodyDef.content);

            const model = this.getModel({ openApi: openApi, definition: schema, parentRef: parentRef });
            const existedModel = models.find(it => isDeepEqual(it, model));
            const tmp = models.map(it => {
                if (it?.description) {
                    return {
                        name: it.name,
                        description: it.description,
                    };
                }
            });

            if (existedModel) {
                requestBody.export = 'reference';
                requestBody.type = existedModel.type;
                requestBody.base = existedModel.base;
                requestBody.path = existedModel.path;
                requestBody.template = existedModel.template;
                requestBody.imports.push(...existedModel.imports);
                return requestBody;
            } else {
                requestBody.export = model.export;
                requestBody.type = model.type;
                requestBody.base = model.base;
                requestBody.path = model.path;
                requestBody.template = model.template;
                requestBody.link = model.link;
                requestBody.isReadOnly = model.isReadOnly;
                requestBody.isRequired = requestBody.isRequired || model.isRequired;
                requestBody.isNullable = requestBody.isNullable || model.isNullable;
                requestBody.format = model.format;
                requestBody.maximum = model.maximum;
                requestBody.exclusiveMaximum = model.exclusiveMaximum;
                requestBody.minimum = model.minimum;
                requestBody.exclusiveMinimum = model.exclusiveMinimum;
                requestBody.multipleOf = model.multipleOf;
                requestBody.maxLength = model.maxLength;
                requestBody.minLength = model.minLength;
                requestBody.maxItems = model.maxItems;
                requestBody.minItems = model.minItems;
                requestBody.uniqueItems = model.uniqueItems;
                requestBody.maxProperties = model.maxProperties;
                requestBody.minProperties = model.minProperties;
                requestBody.pattern = getPattern(model.pattern);
                requestBody.imports.push(...model.imports);
                requestBody.enum.push(...model.enum);
                requestBody.enums.push(...model.enums);
                requestBody.properties.push(...model.properties);
                return requestBody;
            }

            // if (requestBody.mediaType == 'multipart/form-data') {
            //     requestBody.name = 'formData';
            //     return requestBody;
            // }
        }
    }

    return requestBody;
}
