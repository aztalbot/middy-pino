# Middy Pino Logging Middleware

Integrates the [pino](https://github.com/pinojs/pino) logging library with [Middy](https://middy.js.org). 

Features include:

- Cloudwatch log formatting via [pino-lambda](https:/github.com/FormidableLabs/pino-lambda)
- Captures tracking ids in each log, including request ID and xray tracing ID
- Enables debug log sampling via `debugRate` option, or MIDDY_PINO_DEBUG_RATE environment variable
- Adds the logger to the request context, under `contextlog` by default

## Example Usage

### Adding the Middleware

```js
import middy from '@middy/core';

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

// you must still use pino-lambda destination
const logger = pino({ name: 'my-service-name' }, pinoLambdaDestination())

const handler = middy()
    .use(createLoggingMiddleware({ logger }))
    .handler(async (event, context) => {
        context.log.info('handling event');
    });
```

### Sample Debug Logs

```js
import middy from '@middy/core';
const handler = middy()
    // debug logs will appear on roughly half of all requests
    .use(createLoggingMiddleware({ name: 'my-service-name', debugRate: 0.5 }))
    .handler(async (event, context) => {
        context.log.debug('handling event');
    });
```
