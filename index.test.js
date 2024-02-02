import assert from "node:assert"
import { describe, it, beforeEach } from "node:test"
import middy from "@middy/core"
import createLoggingMiddleware, { createLogger } from "./index.js"
import { GlobalContextStorageProvider } from 'pino-lambda';

/**
 * create a fake context for tests
 * @returns {import('aws-lambda').Context}
 */
function createContext() {
    return {
        callbackWaitsForEmptyEventLoop: false,
        functionName: 'foo',
        functionVersion: '1',
        invokedFunctionArn: 'arn:aws:us-east-1:foo',
        memoryLimitInMB: '128',
        awsRequestId: '123',
        logGroupName: 'loggroup/foo',
        logStreamName: 'logstream/123',
        getRemainingTimeInMillis() {
            return 30_000
        },
        done() {},
        success() {},
        fail() {},
    }
}

function assertContextHasLog(context, logKey = 'log') {
    assert(logKey in context, `context has a ${logKey} field`);
    const log = context[logKey];
    assert(typeof log.info === 'function', "logger has an info method");
    assert(typeof log.debug === 'function', "logger has an debug method");
    assert(typeof log.error === 'function', "logger has an error method");
}


describe("createLoggingMiddleware", async (suite) => {
    describe("basic usage", () => {
        /** @type {{ name: string, args: Parameters<createLoggingMiddleware> }[]} */
        const tests = [
            {
                name: 'sets log context values from lambda context',
                args: [],
                warm: false,
                hasLog: true,
                event: {},
                context: createContext(),
                expectedLogContext: { awsRequestId: '123', 'x-correlation-id': '123', coldStart: true }
            },
            {
                name: 'sets log context values from lambda context (warm invocation)',
                args: [],
                warm: true,
                hasLog: true,
                event: {},
                context: createContext(),
                expectedLogContext: { awsRequestId: '123', 'x-correlation-id': '123', coldStart: false }
            },
            {
                name: 'sets x-correlation-id on log context from header if present',
                args: [],
                warm: false,
                hasLog: true,
                event: { headers: { 'x-correlation-id': '456' } },
                context: createContext(),
                expectedLogContext: { awsRequestId: '123', 'x-correlation-id': '456', coldStart: true }
            },
            {
                name: 'leaves out cold start when disabled',
                args: [{ trackColdStart: false }],
                warm: false,
                hasLog: true,
                event: { headers: { 'x-correlation-id': '456' } },
                context: createContext(),
                expectedLogContext: { awsRequestId: '123', 'x-correlation-id': '456' }
            },
            {
                name: 'uses logger if provided',
                args: [{ logger: createLogger() }],
                warm: false,
                hasLog: true,
                event: { headers: { 'x-correlation-id': '456' } },
                context: createContext(),
                expectedLogContext: { awsRequestId: '123', 'x-correlation-id': '456', coldStart: true }
            },
        ]
    
        for (const { name, args, event, context, expectedLogContext, warm, hasLog } of tests) {
            it(name, async () => {
                const handler = middy()
                    .use(createLoggingMiddleware(...args))
                    .handler(async (_, context) => {
                        if (hasLog) assertContextHasLog(context);
    
                        const logContext = GlobalContextStorageProvider.getContext();
                        assert.deepEqual(logContext, expectedLogContext);
                    })
                if (warm) { await handler({}, context).catch((_) => {}) };
                await handler(event, context);
            })
        }
    })

    describe("debug rate", () => {
        const { env } = process;

        beforeEach(() => {
            process.env = env;
        });

        /** @type {{ name: string, args: Parameters<createLoggingMiddleware> }[]} */
        const tests = [
            {
                name: '1 should always set debug level',
                args: [{ debugRate: 1 }],
                shouldDebug: true,
                event: {},
                env: {},
                context: createContext(),
                expectedLogContext: { awsRequestId: '123', 'x-correlation-id': '456', coldStart: true }
            },
            {
                name: '0 should not set debug level',
                args: [{ debugRate: 0 }],
                shouldDebug: false,
                event: {},
                env: {},
                context: createContext(),
                expectedLogContext: { awsRequestId: '123', 'x-correlation-id': '456', coldStart: true }
            },
            {
                name: 'MIDDY_PINO_DEBUG_RATE=1 should set debug level',
                args: [],
                shouldDebug: true,
                event: {},
                env: { MIDDY_PINO_DEBUG_RATE: '1' },
                context: createContext(),
                expectedLogContext: { awsRequestId: '123', 'x-correlation-id': '456', coldStart: true }
            }
        ]

        for (const { name, args, event, context, shouldDebug, env } of tests) {
            it(name, async () => {
                process.env = env;
                const handler = middy()
                    .use(createLoggingMiddleware(...args))
                    .handler(async (_, context) => {
                        assert.equal(context.log.level === 'debug', shouldDebug)
                    })
                await handler(event, context);
            })
        }
    })
})