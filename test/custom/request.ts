/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiRequestOptions } from './ApiRequestOptions';
import { types } from 'util';

type TRequestBody = string | Blob | FormData | Record<string, any>;


function getQueryString(params: Record<string, any>): string {
    const qs: string[] = [];
    Object.keys(params).forEach(key => {
        const value = params[key];
        if (isDefined(value)) {
            if (Array.isArray(value)) {
                value.forEach(value => {
                    qs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
                });
            } else {
                qs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
            }
        }
    });
    if (qs.length > 0) {
        return `?${qs.join('&')}`;
    }
    return '';
}


function getUrl(options: ApiRequestOptions): string {
    const path = options.path.replace(/[:]/g, '_');
    const url = `${path}`;

    if (options.query) {
        return `${url}${getQueryString(options.query)}`;
    }
    return url;
}


function isDefined<T>(value: T | null | undefined): value is Exclude<T, null | undefined> {
    return value !== undefined && value !== null;
}

function isString(value: any): value is string {
    return typeof value === 'string';
}

function isBlob(value: any): value is Blob {
    return value instanceof Blob;
}

function isFormData(value: any): value is FormData {
    return value instanceof FormData;
}

function isBinary(value: any): value is Buffer | ArrayBuffer | ArrayBufferView {
    const isBuffer = Buffer.isBuffer(value);
    const isArrayBuffer = types.isArrayBuffer(value);
    const isArrayBufferView = types.isArrayBufferView(value);
    return isBuffer || isArrayBuffer || isArrayBufferView;
}

export function request<T>(options: ApiRequestOptions): Promise<T> {
    return new Promise((resolve, reject) => {
        try {
            const url = getUrl(options);
            // const contentType = isBlob(options.body) ? 'application/octet-stream' : 'application/json;charset=UTF-8';
            // let responseType = ''
            // if (!isDefined(options.body)) {
            //     responseType = ''
            // } else if (isBlob(options.body)) {
            //     responseType = 'blob';
            // } else if (isBinary(options.body)) {
            //     responseType = 'arraybuffer';
            // } else if (isString(options.body)) {
            //     responseType = 'text';
            // } else if (isFormData(options.body)) {
            //     responseType = 'document';
            // } else {
            //     responseType = 'json';
            // }

            // Do your request...

            resolve({ ...options });
        } catch (error) {
            reject(error);
        }
    })
}