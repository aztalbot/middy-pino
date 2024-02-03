import type { LoggerOptions, Logger } from 'pino';
import type { LambdaRequestTrackerOptions } from 'pino-lambde';
import type { MiddlewareObj } from '@middy/core';
import type { Context } from 'aws-lambda';

export interface LoggingMiddlewareOptions { 
    logger?: Logger,
    loggerOptions?: LoggerOptions,
    trackerOptions?: LambdaRequestTrackerOptions,
    trackColdStart?: boolean,
    debugRate?: number,
 }

export type PinoMiddleware = MiddlewareObj<
    unknown,
    unknown,
    Error,
    Context & { log: Logger } // add log to context
>
