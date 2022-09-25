'use strict';

const generate = require('./scripts/generate');
const compileWithTypescript = require('./scripts/compileWithTypescript');
const server = require('./scripts/server');

describe('v2.axios', () => {
    beforeAll(async () => {
        await generate('v2/axios', 'v2', 'axios');
        compileWithTypescript('v2/axios');
        await server.start('v2/axios');
    });

    afterAll(async () => {
        await server.stop();
    });

    it('requests token', async () => {
        const { OpenAPI, SimpleService } = require('./generated/v2/axios/index.js');
        const tokenRequest = jest.fn().mockResolvedValue('MY_TOKEN');
        OpenAPI.TOKEN = tokenRequest;
        const result = await SimpleService.getCallWithoutParametersAndResponse();
        expect(tokenRequest.mock.calls.length).toBe(1);
        expect(result.headers.authorization).toBe('Bearer MY_TOKEN');
    });

    it('complexService', async () => {
        const { ComplexService } = require('./generated/v2/axios/index.js');
        const result = await ComplexService.complexTypes({
            first: {
                second: {
                    third: 'Hello World!',
                },
            },
        });
        expect(result).toBeDefined();
    });
});
