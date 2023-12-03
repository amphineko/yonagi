import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common"
import { ResponseOf } from "@yonagi/common/api/common"
import * as t from "io-ts/lib/index"
import { Observable, map } from "rxjs"

@Injectable()
export class ResponseInterceptor<T extends t.Mixed> implements NestInterceptor<T, ResponseOf<T>> {
    intercept(_context: ExecutionContext, next: CallHandler): Observable<ResponseOf<T>> {
        return next.handle().pipe(map((data: T) => ({ data, message: "ok", statusCode: 200 })))
    }
}
