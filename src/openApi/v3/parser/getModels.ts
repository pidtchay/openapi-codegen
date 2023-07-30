import type { Model } from '../../../client/interfaces/Model';
import { join, relative } from '../../../core/path';
import { calculateRelativePath, getRelativeModelImportPath } from '../../../utils/getRelativeModelImportPath';
import { getRelativeModelPath } from '../../../utils/getRelativeModelPath';
import { sortModelsByName } from '../../../utils/sortModelsByName';
import { unique } from '../../../utils/unique';
import { OpenAPIV3 } from '../../interfaces/OpenApiTypes';
import { Parser } from '../Parser';

const SCHEMA_HTTP_METHODS_ARRAY: string[] = Object.values(OpenAPIV3.HttpMethods);

/**
 * В OpenApi есть два блока, где есть модели:
 * - components Тут все ясно, если есть, то формируем модели, если нет, то пропускаемм
 * - paths Тут сложно
 */
export function getModels(this: Parser, openApi: OpenAPIV3.Document): Model[] {
    let models: Model[] = [];

    if (openApi?.components) {
        for (const definitionName in openApi.components.schemas) {
            if (openApi.components.schemas.hasOwnProperty(definitionName)) {
                const definition = openApi.components.schemas[definitionName] as OpenAPIV3.SchemaObject;
                const definitionType = this.getType(definitionName, definition);
                const modelPath = getRelativeModelPath(this.context.output?.outputModels, definitionType.path);
                const model = this.getModel({ openApi: openApi, definition: definition, isDefinition: true, name: definitionType.base, path: modelPath, parentRef: '' });
                models.push(model);
            }
        }
        for (const definitionName in openApi.components.parameters) {
            if (openApi.components.parameters.hasOwnProperty(definitionName)) {
                const definition = openApi.components.parameters[definitionName] as OpenAPIV3.ParameterObject;
                const definitionType = this.getType(definitionName, definition?.schema as OpenAPIV3.SchemaObject);
                const modelPath = getRelativeModelPath(this.context.output?.outputModels, definitionType.path);
                const difinitionSchema = definition?.schema as OpenAPIV3.SchemaObject;
                if (difinitionSchema) {
                    const model = this.getModel({ openApi: openApi, definition: difinitionSchema, isDefinition: true, name: definitionType.base, path: modelPath, parentRef: '' });
                    models.push(model);
                }
            }
        }
    } else {
        const refsValues = this.context.values();
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
                const definitionType = this.getType(definitionName, definition);
                /**
                 * definitionName содержит абсолютный путь до файла спецификации.
                 * Поэтому необходимо его превратить в относительный путь.
                 * А потом нормализовать по отношению к outputModels.
                 */
                const calculatedPath = calculateRelativePath(this.context.filePath(), definitionType.path);
                const modelPath = getRelativeModelPath(this.context.output?.outputModels, calculatedPath);
                const model = this.getModel({ openApi: openApi, definition: definition as any, isDefinition: true, name: definitionType.base, path: modelPath, parentRef: '' });
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
                path: getRelativeModelImportPath(this.context.output?.outputModels, importPath, model.path),
            });
        });
    });

    return models.filter(unique);
}
