import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== "http") throw exception;
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message: string | string[];
    let error: string;

    const isProduction = process.env.NODE_ENV === "production";

    if (typeof exceptionResponse === "string") {
      message = exceptionResponse;
      error = HttpStatus[status] || "Error";
    } else if (
      exceptionResponse &&
      typeof exceptionResponse === "object" &&
      "message" in exceptionResponse
    ) {
      const resObj = exceptionResponse as {
        message?: string | string[];
        error?: string;
      };
      message = resObj.message || "An unexpected error occurred";
      error = resObj.error || HttpStatus[status] || "Error";
    } else {
      message = isProduction
        ? "Internal Server Error"
        : exception instanceof Error
        ? exception.message
        : "Internal Server Error";
      error = HttpStatus[status] || "Internal Server Error";
    }

    const sanitizedUrl = request.url.replace(
      /([?&](ticket|token|secret)=)[^&]+/gi,
      "$1[REDACTED]",
    );

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${sanitizedUrl} - Status: ${status} - Error: ${
          exception instanceof Error ? exception.stack : JSON.stringify(exception)
        }`,
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: sanitizedUrl,
    });
  }
}
