import { lambdaRequestTracker, pinoLambdaDestination } from 'pino-lambda';
import pino from 'pino';

const defaultLogKey = 'log';
const logDebugRateEnvVar = 'MIDDY_PINO_DEBUG_RATE';
const debugLabel = 'debug';

/**
 * 
 * @param {Partial<Pick<import('pino-lambda').LambdaRequestTrackerOptions, "requestMixin">>} nextTracker 
 * @returns 
 */
function coldStartMixin(nextTracker) {
    let coldStart = true;
    /** @type {Pick<import('pino-lambda').LambdaRequestTrackerOptions, "requestMixin">} */
    const options = {
        ...nextTracker,
        requestMixin(...args) {
            const additionalFields = { coldStart }
            if (coldStart) coldStart = false;
            Object.assign(additionalFields, nextTracker?.requestMixin?.(...args))
            return additionalFields
        }
    }
    return options 
}

function getDebugRateFromEnv() {
    const parsed = Number.parseFloat(process.env[logDebugRateEnvVar])
    return isNaN(parsed) ? 0 : parsed
}

/**
 * @param {number} rate 
 */
function shouldDebug(rate) {
    return Math.random() < rate;
}

/**
 * creates a pino Logger with Cloudwatch formatting configured via a custom destination
 * @param {import('pino').LoggerOptions} options
 */
export function createLogger(options) {
    return pino(options, pinoLambdaDestination());
}

/**
 * # Middy Pino Logging Middleware
 * 
 * Integrates the pino logging library with Middy. Features include:
 *     - Cloudwatch log formatting
 *     - Captures tracking ids in each log, including request ID and xray tracing ID
 *     - Enables debug log sampling via `debugRate` option, or MIDDY_PINO_DEBUG_RATE environment variable
 *     - Adds the logger to the request context, under `context.log` by default
 * 
 * ## Example Usage
 * 
 * ### Adding the Middleware
 * 
 * ```js
 * import middy from '@middy/core';
 * const handler = middy()
 *  .use(createLoggingMiddleware({ name: 'my-service-name' }))
 *  .handler(async (event, context) => {
 *      context.log.info('handling event');
 *  });
 * ```
 * 
 * ### Bring Your Own Pino
 * 
 * ```js
 * import middy from '@middy/core';
 * import pino from 'pino';
 * import { pinoLambdaDestination } from 'pino-lambda';
 * 
 * // you must still use pino-lambda destination
 * const logger = pino({ name: 'my-service-name' }, pinoLambdaDestination())
 * 
 * const handler = middy()
 *  .use(createLoggingMiddleware({ logger }))
 *  .handler(async (event, context) => {
 *      context.log.info('handling event');
 *  });
 * ```
 * 
 * ### Sample Debug Logs
 * 
 * ```js
 * import middy from '@middy/core';
 * const handler = middy()
 *  // debug logs will appear on roughly half of all requests
 *  .use(createLoggingMiddleware({ name: 'my-service-name', debugRate: 0.5 }))
 *  .handler(async (event, context) => {
 *      context.log.info('handling event');
 *  });
 * ```
 * 
 * @param {import('./types').LoggingMiddlewareOptions} logger 
 * @returns {import('@middy/core').MiddlewareObj<unknown, unknown, Error, import('aws-lambda').Context & { log: import('pino').Logger }}}
 */
function createLoggingMiddleware({
    logger,
    loggerOptions = {},
    trackerOptions = {},
    trackColdStart = true,
    debugRate = getDebugRateFromEnv(),
} = {}) {
    const log = logger ?? createLogger(loggerOptions);

    const originalLevel = log.level;
    const isDebugDisabled = log.levels.values[originalLevel] > log.levels.values[debugLabel];

    if (trackColdStart) {
        trackerOptions = coldStartMixin(trackerOptions);
    }

    const withRequest = lambdaRequestTracker(trackerOptions);

    const before = ({ event, context }) => {
        withRequest(event, context);
        log.level = isDebugDisabled && shouldDebug(debugRate) ? debugLabel : originalLevel;;
        context[defaultLogKey] = log;
    }

    return { before }
}

export default createLoggingMiddleware;
