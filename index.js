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
 * @description Middy Pino Logging Middleware, see {@link https://github.com/aztalbot/middy-pino#readme}
 * @example
 * ```js
 * import middy from '@middy/core';
 * import createLoggingMiddleware from 'middy-pino';
 * 
 * const handler = middy()
 *  .use(createLoggingMiddleware({ name: 'my-service-name' }))
 *  .handler(async (event, context) => {
 *      context.log.info('handling event');
 *  });
 * ```
 * @param {import('./types').LoggingMiddlewareOptions} logger 
 * @returns {import('./types').PinoMiddleware} middy middleware object
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

    /** @type {import('@middy/core').MiddlewareObj["before"]} */
    const before = ({ event, context }) => {
        withRequest(event, context);
        log.level = isDebugDisabled && shouldDebug(debugRate) ? debugLabel : originalLevel;;
        context[defaultLogKey] = log;
    }

    return { before }
}

export default createLoggingMiddleware;
