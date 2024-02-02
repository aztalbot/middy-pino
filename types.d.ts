import type { LoggerOptions, Logger } from 'pino';
import type { LambdaRequestTrackerOptions } from 'pino-lambde';

export interface LoggingMiddlewareOptions { 
    logger?: Logger,
    loggerOptions?: LoggerOptions,
    trackerOptions?: LambdaRequestTrackerOptions,
    trackColdStart?: boolean,
    debugRate?: number,
 }
