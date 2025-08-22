// src/common/interceptors/response.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseFormat<T> {
  success: boolean;
  data: T;
  message: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ResponseFormat<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseFormat<T>> {
    return next.handle().pipe(
      map((data) => {
        // If the service/controller returned an object with { data, message }
        if (data && typeof data === 'object' && 'data' in data && 'message' in data) {
          return {
            success: true,
            data: data.data,
            message: data.message,
          };
        }

        // Otherwise, wrap raw data
        return {
          success: true,
          data,
          message: 'Request successful',
        };
      }),
    );
  }
}
