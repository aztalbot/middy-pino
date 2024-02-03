# Middy Pino Logging Middleware

Integrates the [pino](https://github.com/pinojs/pino) logging library with [Middy](https://middy.js.org). 

Features include:

- Cloudwatch log formatting via [pino-lambda](https:/github.com/FormidableLabs/pino-lambda)
- Captures tracking ids in each log, including request ID and xray tracing ID
- Enables debug log sampling via `debugRate` option, or MIDDY_PINO_DEBUG_RATE environment variable
- Adds the logger to the request context, under `context.log` by default

Refer to the documentation for [Pino](https://getpino.io/#/) for configuration and usage of the logger.

Refer to the [documentation for Pino Lambda](https://github.com/FormidableLabs/pino-lambda#readme) for additional configuration of log formatting.

## Example Usage

### Adding the Middleware

```js
import middy from '@middy/core';
import createLoggingMiddleware from "middy-pino" ;

const handler = middy()
    .use(createLoggingMiddleware({ name: 'my-service-name' }))
    .handler(async (event, context) => {
        context.log.info('handling event');
    });
```

### Bring Your Own Pino

```js
import middy from '@middy/core';
import pino from 'pino';
import { pinoLambdaDestination } from 'pino-lambda';
import createLoggingMiddleware from "middy-pino" ;

// you must still use pino-lambda destination
const logger = pino({ name: 'my-service-name' }, pinoLambdaDestination())

const handler = middy()
    .use(createLoggingMiddleware({ logger }))
    .handler(async (event, context) => {
        context.log.info('handling event');
    });
```

### Sharing Logger Outside Handler

```js
// logger.js
import { createLogger } from "middy-pino" ;

export default createLogger({ name: 'my-service-name' });

// someModule.js
import logger from './logger.js'

export functionDoSomething() {
    logger.info('doing something outside handler')
}

// index.js
import middy from '@middy/core';
import logger from './logger.js'

const handler = middy()
    .use(createLoggingMiddleware({ logger }))
    .handler(async (event, context) => {
        context.log.info('handling event');
    });
```

### Track Additional Fields

```js
import middy from '@middy/core';
const handler = middy()
    // debug logs will appear on roughly half of all requests
    .use(createLoggingMiddleware({
        name: 'my-service-name', 
        trackerOptions: {
            requestMixin(event) {
                return {
                    customCorrelationId: event.headers['custom-correlation-id']
                }
            }
        }
    }))
    .handler(async (event, context) => {
        context.log.info('handling event'); // includes `customCorrelationId` field in each log
    });
```

### Sample Debug Logs

```js
import middy from '@middy/core';
const handler = middy()
    // debug logs will appear on roughly half of all requests
    // below is equivalent to setting MIDDY_PINO_DEBUG_RATE environment variable to '0.5'
    .use(createLoggingMiddleware({ name: 'my-service-name', debugRate: 0.5 }))
    .handler(async (event, context) => {
        context.log.debug('handling event');
    });
```
