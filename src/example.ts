import RefParser from 'json-schema-ref-parser';

import { Model } from './client/interfaces/Model';
import { ModelComposition } from './client/interfaces/ModelComposition';
import { Type } from './client/interfaces/Type';
import { dirName, join, relative, resolve } from './core/path';
import { replaceString } from './core/replaceString';
import { HttpClient } from './HttpClient';
import { OpenAPIV3 } from './openApi/interfaces/OpenApiTypes';
import { escapeName } from './openApi/v3/parser/escapeName';
import { getComment } from './openApi/v3/parser/getComment';
import { getEnum } from './openApi/v3/parser/getEnum';
import { getEnumFromDescription } from './openApi/v3/parser/getEnumFromDescription';
import { getMappedType, hasMappedType } from './openApi/v3/parser/getMappedType';
import { stripNamespace } from './openApi/v3/parser/stripNamespace';
import { encode } from './utils/encode';
import { exists, mkdir, rmdir } from './utils/fileSystem';
import { getClassName } from './utils/getClassName';
import { getPattern } from './utils/getPattern';
import { calculateRelativePath, getRelativeModelImportPath } from './utils/getRelativeModelImportPath';
import { getRelativeModelPath } from './utils/getRelativeModelPath';
import { isString } from './utils/isString';
import { isSubDirectory } from './utils/isSubdirectory';
import { registerHandlebarTemplates } from './utils/registerHandlebarTemplates';
import { sortModelsByName } from './utils/sortModelsByName';
import { unique } from './utils/unique';
import { writeClientModels } from './utils/writeClientModels';

function getType(value: string): Type {
    const normalizedValue = replaceString(value);

    const result: Type = {
        type: 'any',
        base: 'any',
        imports: [],
        path: '',
        template: null,
    };

    const valueClean = stripNamespace(normalizedValue || '');
    if (hasMappedType(valueClean)) {
        const mapped = getMappedType(valueClean);
        result.path = valueClean;
        if (mapped) {
            result.type = mapped;
            result.base = mapped;
        }
    } else if (valueClean) {
        const type = getTypeName(valueClean);
        result.path = valueClean;
        result.type = type;
        result.base = type;
        result.imports.push({ name: type, alias: '', path: valueClean });
    }
    return result;
}

function getTypeName(value: string): string {
    const index = value.lastIndexOf('/');
    if (index === -1) {
        return encode(value);
    }
    return encode(value.substring(index, value.length));
}

export function getModelDefault(definition: OpenAPIV3.SchemaObject, model?: Model): string | undefined {
    if (definition.default === undefined) {
        return;
    }

    if (definition.default === null) {
        return 'null';
    }

    const type = definition.type || typeof definition.default;

    switch (type) {
        case 'bigint':
        case 'integer':
        case 'number':
            if (model?.export === 'enum' && model.enum?.[definition.default]) {
                return model.enum[definition.default].value;
            }
            return definition.default;

        case 'boolean':
            return JSON.stringify(definition.default);

        case 'string':
            return `'${definition.default}'`;

        case 'object':
            try {
                return JSON.stringify(definition.default, null, 4);
            } catch (e) {
                // Ignore
            }
    }

    return;
}

type TModelConfig = {
    openApi: OpenAPIV3.Document;
    definition: OpenAPIV3.SchemaObject;
    isDefinition?: boolean;
    name?: string;
    path?: string;
    parentRef: string;
};

function getModel(config: TModelConfig): Model {
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
        const arrayItems = getModel({ openApi: openApi, definition: definition.items as OpenAPIV3.SchemaObject, parentRef: parentRef });
        model.export = 'array';
        model.type = arrayItems.type;
        model.base = arrayItems.base;
        model.link = arrayItems;
        model.imports.push(...arrayItems.imports);
        model.default = getModelDefault(definition, model);
        return model;
    }

    if (definition.type === 'object' && typeof definition.additionalProperties === 'object') {
        const additionalProperties = getModel({
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
        const composition = getModelComposition(openApi, definition, oneOfArray, 'one-of', parentRef);
        model.export = composition.type;
        model.imports.push(...composition.imports);
        model.properties.push(...composition.properties);
        model.enums.push(...composition.enums);
        return model;
    }

    const anyOfArray = definition?.anyOf ? (definition.anyOf as OpenAPIV3.SchemaObject[]) : [];
    if (anyOfArray.length) {
        const composition = getModelComposition(openApi, definition, anyOfArray, 'any-of', parentRef);
        model.export = composition.type;
        model.imports.push(...composition.imports);
        model.properties.push(...composition.properties);
        model.enums.push(...composition.enums);
        return model;
    }

    const allOfArray = definition?.allOf ? (definition.allOf as OpenAPIV3.SchemaObject[]) : [];
    if (allOfArray.length) {
        const composition = getModelComposition(openApi, definition, allOfArray, 'all-of', parentRef);
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
            const properties = getModelProperties(openApi, definition, parentRef);
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
        const definitionType = getType(definition.type);
        model.export = 'generic';
        model.type = definitionType.type;
        model.base = definitionType.base;
        model.imports.push(...definitionType.imports);
        model.default = getModelDefault(definition, model);
        return model;
    }

    return model;
}

function getModelProperties(openApi: OpenAPIV3.Document, definition: OpenAPIV3.SchemaObject, parentRef: string): Model[] {
    const models: Model[] = [];
    for (const propertyName in definition.properties) {
        if (definition.properties.hasOwnProperty(propertyName)) {
            const property = definition.properties[propertyName] as OpenAPIV3.SchemaObject;
            const propertyRequired = definition.required?.includes(propertyName) || property.default !== undefined;
            const model = getModel({ openApi: openApi, definition: property, parentRef: parentRef });
            models.push({
                ...model,
                name: escapeName(propertyName),
                alias: model.export === 'enum' ? getClassName(escapeName(propertyName)) : '',
                // alias: model.export === 'enum' ? `${this.context.prefix.enum}${getClassName(escapeName(propertyName))}` : '',
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
            });
        }
    }

    return models;
}

function getModelComposition(
    openApi: OpenAPIV3.Document,
    definition: OpenAPIV3.SchemaObject,
    definitions: OpenAPIV3.SchemaObject[],
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
        getModel({
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
        const properties = getModelProperties(openApi, definition, parentRef);
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

const SCHEMA_HTTP_METHODS_ARRAY: string[] = Object.values(OpenAPIV3.HttpMethods);

async function generateApi(input: string, output: string) {
    if (output) {
        await rmdir(output);
    }

    const inputDir = dirName(input);
    const outputPath = resolve(process.cwd(), output);
    const outputPathModels = resolve(outputPath, 'models');
    if (!isSubDirectory(process.cwd(), output)) {
        throw new Error(`Output folder is not a subdirectory of the current working directory`);
    }
    await mkdir(outputPathModels);

    if (isString(input)) {
        const absoluteInput = resolve(process.cwd(), input);
        if (!input) {
            throw new Error(`Could not find OpenApi spec: "${absoluteInput}"`);
        }
        const fileExists = await exists(absoluteInput);
        if (!fileExists) {
            throw new Error(`Could not read OpenApi spec: "${absoluteInput}"`);
        }
    }

    const parser = new RefParser();
    const schema = (await parser.dereference(input)) as OpenAPIV3.Document;
    const refs: RefParser.$Refs = parser.$refs;
    const refsValues = refs.values();

    function getModels(openApi: OpenAPIV3.Document, outputModels: string): Model[] {
        let models: Model[] = [];

        if (openApi.components) {
            for (const definitionName in openApi.components.schemas) {
                if (openApi.components.schemas.hasOwnProperty(definitionName)) {
                    const definition = openApi.components.schemas[definitionName] as OpenAPIV3.SchemaObject;
                    const definitionType = getType(definitionName);
                    const modelPath = getRelativeModelPath(outputModels, definitionType.path);
                    const model = getModel({ openApi: openApi, definition: definition, isDefinition: true, name: definitionType.base, path: modelPath, parentRef: '' });
                    models.push(model);
                }
            }
            for (const definitionName in openApi.components.parameters) {
                if (openApi.components.parameters.hasOwnProperty(definitionName)) {
                    const definition = openApi.components.parameters[definitionName] as OpenAPIV3.ParameterObject;
                    const definitionType = getType(definitionName);
                    const modelPath = getRelativeModelPath(outputModels, definitionType.path);
                    const difinitionSchema = definition?.schema as OpenAPIV3.SchemaObject;
                    if (difinitionSchema) {
                        const model = getModel({ openApi: openApi, definition: difinitionSchema, isDefinition: true, name: definitionType.base, path: modelPath, parentRef: '' });
                        models.push(model);
                    }
                }
            }
        } else if (!openApi.components && openApi.paths) {
            // В случае, когда все описание моделей - это ref ссылки внутри paths
            // необходимо пройтись по всем объектам ref и сформировать модели.
            const listOfAllRef = Object.entries(refsValues);
            if (listOfAllRef.length > 0) {
                // Удаление главного файла спецификации из массива.
                listOfAllRef.shift();
                const operationsList = listOfAllRef.filter(([_definitionName, definition]) => Object.keys(definition).some(key => SCHEMA_HTTP_METHODS_ARRAY.includes(key)));
                const toDeleteSet = new Set(operationsList);
                const listOfModelsRef = listOfAllRef.filter(item => !toDeleteSet.has(item));
                for (const [definitionName, definition] of listOfModelsRef) {
                    const definitionType = getType(definitionName);
                    /**
                     * definitionName содержит абсолютный путь до файла спецификации.
                     * Поэтому необходимо его превратить в относительный путь.
                     * А потом нормализовать по отношению к outputModels.
                     */
                    const calculatedPath = calculateRelativePath(inputDir, definitionType.path);
                    const modelPath = getRelativeModelPath(outputModels, calculatedPath);
                    const model = getModel({ openApi: openApi, definition: definition as any, isDefinition: true, name: definitionType.base, path: modelPath, parentRef: '' });
                    models.push(model);
                }
            }
        }

        const filteredModels = models.filter(unique);
        models = sortModelsByName(filteredModels);
        let previous: Model;
        let index = 1;
        models.forEach(model => {
            if (previous && previous.name === model.name) {
                if (index === 1) {
                    previous.alias = `${model.name}$${index}`;
                    index++;
                }
                model.alias = `${model.name}$${index}`;
                index++;
            } else {
                model.alias = '';
                index = 1;
            }
            previous = model;
        });
        models.forEach(model => {
            model.imports = model.imports.map(imprt => {
                const importModel = models.filter(value => `${value.path}${value.name}` === imprt.path && value.name === imprt.name);
                const importAlias = importModel.length > 0 ? importModel[0].alias : imprt?.alias;
                const importPath = importModel.length > 0 ? join(relative(model.path, importModel[0].path), imprt.name) : imprt.path;
                return Object.assign(imprt, {
                    alias: importAlias,
                    path: getRelativeModelImportPath(outputModels, importPath, model.path),
                });
            });
        });

        return models;
    }

    const models = getModels(schema, outputPathModels);

    const templates = registerHandlebarTemplates({
        httpClient: HttpClient.FETCH,
        useUnionTypes: false,
        useOptions: false,
    });

    await writeClientModels({
        models: models,
        templates,
        outputPath: outputPathModels,
        httpClient: HttpClient.FETCH,
        useUnionTypes: false,
    });
}

export { generateApi };
