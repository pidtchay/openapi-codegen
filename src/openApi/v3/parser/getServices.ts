import { Import } from '../../../client/interfaces/Import';
import { Model } from '../../../client/interfaces/Model';
import type { Service } from '../../../client/interfaces/Service';
import { dirName, join } from '../../../core/path';
import { getClassName } from '../../../utils/getClassName';
import { unique } from '../../../utils/unique';
import { OpenAPIV3 } from '../../interfaces/OpenApiTypes';
import { Parser } from '../Parser';
import { getServiceClassName } from './getServiceClassName';

function getServiceName(operation: OpenAPIV3.OperationObject, fileName: string): string {
    return getServiceClassName(operation.tags?.[0] || `${getClassName(fileName)}Service`);
}

function fillModelsByAlias(items: Model[], value: Import) {
    items
        .filter(result => result.path === value.path && result.type === value.name && value.alias)
        .forEach(result => {
            result.alias = value.alias;
            result.base = value.alias;
        });
}

const SCHEMA_HTTP_METHODS_ARRAY: string[] = Object.values(OpenAPIV3.HttpMethods);

/*
for (const definitionName in openApi.paths) {
    const definitionType = getType(definitionName);
    const pathItem: OpenAPIV3.PathItemObject = openApi.paths[definitionName] || {};
    if (pathItem.parameters) {
        for (const parameter of pathItem.parameters) {
            if (isType<OpenAPIV3.ParameterObject>(parameter) && parameter?.schema) {
                pathSchemas.push((parameter as OpenAPIV3.ParameterObject).schema as OpenAPIV3.SchemaObject);
                // TODO Check result!
                const modelPath = getRelativeModelPath(outputModels, definitionType.path);
                const model = getModel({
                    openApi: openApi,
                    definition: (parameter as OpenAPIV3.ParameterObject).schema as any,
                    isDefinition: true,
                    name: definitionType.base,
                    path: modelPath,
                    parentRef: '',
                });
                models.push(model);
                // newPathSchemas = Object.assign(newPathSchemas, { [path]: (parameter as OpenAPIV3.ParameterObject).schema as OpenAPIV3.SchemaObject });
            }
        }
    }
    const operationsArray = [
        OpenAPIV3.HttpMethods.GET,
        OpenAPIV3.HttpMethods.DELETE,
        OpenAPIV3.HttpMethods.HEAD,
        OpenAPIV3.HttpMethods.OPTIONS,
        OpenAPIV3.HttpMethods.PATCH,
        OpenAPIV3.HttpMethods.POST,
        OpenAPIV3.HttpMethods.PUT,
        OpenAPIV3.HttpMethods.TRACE,
    ];
    for (const operationName of operationsArray) {
        const operation = pathItem[operationName];
        if (operation && operation.requestBody) {
            const requestBody = operation.requestBody as OpenAPIV3.RequestBodyObject;
            if (requestBody?.content?.['application/json']?.schema) {
                pathSchemas.push(requestBody.content['application/json'].schema as OpenAPIV3.SchemaObject);
                // TODO Check result!
                const modelPath = getRelativeModelPath(outputModels, definitionType.path);
                const model = getModel({
                    openApi: openApi,
                    definition: requestBody.content['application/json'].schema as any,
                    isDefinition: true,
                    name: definitionType.base,
                    path: modelPath,
                    parentRef: '',
                });
                models.push(model);
            }
        }

        if (operation && operation.responses) {
            for (const response in operation.responses) {
                if (response === 'default' || (Number.isInteger(parseInt(response)) && parseInt(response) >= 200 && parseInt(response) < 300)) {
                    const responseObject = operation.responses[response] as OpenAPIV3.ResponseObject;
                    if (responseObject?.content?.['application/json']?.schema) {
                        pathSchemas.push(responseObject.content['application/json'].schema as OpenAPIV3.SchemaObject);
                        // TODO Check result!
                        const modelPath = getRelativeModelPath(outputModels, definitionType.path);
                        const model = getModel({
                            openApi: openApi,
                            definition: responseObject.content['application/json'].schema as any,
                            isDefinition: true,
                            name: definitionType.base,
                            path: modelPath,
                            parentRef: '',
                        });
                        models.push(model);
                    }
                }
            }
        }
    }
}
*/

/**
 * Get the OpenAPI services
 *
 * Есть массив моделей. Они иммеют разные параметры, по которым можно найти совпадение.
 * Есть блок paths с обезличенными моделями.
 * Попробовать сгенерировать описание модели на основе разных блоков методов
 * сравнить модели в массиве и за пределами.
 */
export function getServices(this: Parser, openApi: OpenAPIV3.Document, models: Model[]): Service[] {
    const services = new Map<string, Service>();

    for (const url in openApi.paths) {
        if (openApi.paths.hasOwnProperty(url)) {
            // Grab path and parse any global path parameters
            const pathItem: OpenAPIV3.PathItemObject = openApi.paths[url] || {};

            for (const operationName of SCHEMA_HTTP_METHODS_ARRAY) {
                const method = pathItem[operationName as OpenAPIV3.HttpMethods];
                if (method) {
                    const fileName = this.context.fileName();
                    const serviceName = getServiceName(method, fileName);
                    const root = '';
                    const pathItemRef = pathItem?.$ref || '';
                    const newParentRef = pathItemRef.match(/^(http:\/\/|https:\/\/)/g) ? '' : pathItemRef.match(/^(#\/)/g) ? root : join(dirName(root), pathItemRef);
                    // const parameters: OpenAPIV3.ParameterObject[] = method.parameters as OpenAPIV3.ParameterObject[];
                    // const pathParams = this.getOperationParameters(openApi, parameters);
                    // If we have already declared a service, then we should fetch that and
                    // append the new method to it. Otherwise we should create a new service object.
                    const service =
                        services.get(serviceName) ||
                        ({
                            name: serviceName,
                            originName: getClassName(method.tags?.[0] || fileName),
                            operations: [],
                            imports: [],
                        } as Service);
                    const operation = this.getOperation(openApi, url, operationName, method, serviceName, models, newParentRef);
                    service.operations.push(operation);
                    operation.imports = operation.imports.map(item => {
                        const operationImport = service.imports.find(serviceImport => serviceImport.path === item.path);
                        if (!operationImport) {
                            return item;
                        }
                        return operationImport;
                    });
                    service.imports.push(...operation.imports);
                    services.set(operation.service, service);
                }
            }
        }
    }
    services.forEach(service => {
        service.imports = service.imports.filter(unique).sort((a, b) => {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            return nameA.localeCompare(nameB, 'en');
        });
        let previous: Import;
        let index = 1;
        service.imports = service.imports.map(value => {
            if (previous && previous.name === value.name) {
                if (index === 1) {
                    previous.alias = `${value.name}$${index}`;
                    index++;
                }
                value.alias = `${value.name}$${index}`;
                index++;
            } else {
                value.alias = '';
                index = 1;
            }
            previous = value;
            return value;
        });
        service.imports.forEach(item => {
            for (const operation of service.operations) {
                fillModelsByAlias(operation.results, item);
                fillModelsByAlias(operation.parameters, item);
            }
        });
    });
    const result = Array.from(services.values());
    console.log(result);
    return Array.from(services.values());
}
