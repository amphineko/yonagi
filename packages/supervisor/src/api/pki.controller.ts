import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Inject,
    InternalServerErrorException,
    NotFoundException,
    Param,
    Post,
    UseInterceptors,
    forwardRef,
} from "@nestjs/common"
import {
    CertificateSummary,
    CertificateSummaryType,
    CreateCertificateRequestType,
    ExportClientCertificateP12RequestType,
    GetPkiSummaryResponse,
} from "@yonagi/common/api/pki"
import { SerialNumberString, SerialNumberStringType } from "@yonagi/common/types/pki/SerialNumberString"
import { getOrThrow, tryCatchF } from "@yonagi/common/utils/TaskEither"
import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"
import * as PR from "io-ts/lib/PathReporter"
import * as pkijs from "pkijs"

import { ResponseInterceptor } from "./api.middleware"
import { EncodeResponseWith, validateRequestParam } from "./common"
import { formatValueHex, getCertificateSerialAsHexString, parsePkijsRdn } from "../pki/exchange"
import { Certificate, Pki } from "../pki/pki"

@Controller("/api/v1/pki")
@UseInterceptors(ResponseInterceptor)
export class PkiController {
    constructor(@Inject(forwardRef(() => Pki)) private pki: Pki) {}

    @Get("/")
    @EncodeResponseWith(GetPkiSummaryResponse)
    async get(): Promise<GetPkiSummaryResponse> {
        const ca = (await this.pki.getCertificateAuthority())?.cert
        const server = (await this.pki.getServerCertificate())?.cert
        const clients = await this.pki.listClientCertificates()
        return {
            ca: ca ? this.getCertificateSummary(ca) : undefined,
            server: server ? this.getCertificateSummary(server) : undefined,
            clients: clients.map((c) => this.getCertificateSummary(c.cert)),
        }
    }

    @Post("/ca")
    @EncodeResponseWith(CertificateSummaryType)
    async createCertificateAuthority(@Body() body: unknown): Promise<CertificateSummary> {
        return await this.createCertificateFromRequest(body, CreateCertificateRequestType, ({ subject, validity }) =>
            this.pki.createCertificateAuthority(subject, validity),
        )
    }

    @Delete("/ca/:serial")
    @EncodeResponseWith(t.undefined)
    async deleteCertificateAuthority(@Param("serial") u: unknown): Promise<void> {
        await this.deleteCertificateBySerial(
            u,
            () => this.pki.getCertificateAuthority(),
            () => this.pki.deleteCertificateAuthority(),
        )
    }

    @Post("/server")
    @EncodeResponseWith(CertificateSummaryType)
    async createServerCertificate(@Body() body: unknown): Promise<CertificateSummary> {
        return await this.createCertificateFromRequest(body, CreateCertificateRequestType, ({ subject, validity }) =>
            this.pki.createServerCertificate(subject, validity),
        )
    }

    @Delete("/server/:serial")
    @EncodeResponseWith(t.undefined)
    async deleteServerCertificate(@Param("serial") u: unknown): Promise<void> {
        await this.deleteCertificateBySerial(
            u,
            () => this.pki.getServerCertificate(),
            () => this.pki.deleteServerCertificate(),
        )
    }

    @Post("/clients")
    @EncodeResponseWith(CertificateSummaryType)
    async createClientCertificate(@Body() body: unknown): Promise<CertificateSummary> {
        return await this.createCertificateFromRequest(body, CreateCertificateRequestType, ({ subject, validity }) =>
            this.pki.createClientCertificate(subject, validity),
        )
    }

    @Delete("/clients/:serial")
    @EncodeResponseWith(t.undefined)
    async deleteClientCertificate(@Param("serial") serial: unknown): Promise<void> {
        await this.deleteCertificateBySerial(
            serial,
            (serial) => this.pki.getClientCertificate(serial),
            (serial) => this.pki.deleteClientCertificate(serial),
        )
    }

    @Post("/clients/:serial/p12")
    @EncodeResponseWith(t.string)
    async exportClientCertificateP12(@Param("serial") serial: unknown, @Body() body: unknown): Promise<string> {
        return await F.pipe(
            E.Do,
            E.bindW("serial", () => validateRequestParam(serial, SerialNumberStringType)),
            E.bindW("options", () => validateRequestParam(body, ExportClientCertificateP12RequestType)),
            TE.fromEither,
            tryCatchF(
                ({ serial, options: { password } }) => this.pki.exportClientCertificateP12(serial, password),
                (reason) => new InternalServerErrorException(`Cannot export certificate chain: ${String(reason)}`),
            ),
            TE.map((p12) => Buffer.from(p12).toString("base64")),
            getOrThrow(),
        )()
    }

    private createCertificateFromRequest<T>(
        body: unknown,
        decoder: t.Decoder<unknown, T>,
        create: (req: T) => Promise<Certificate>,
    ) {
        return F.pipe(
            TE.fromEither(decoder.decode(body)),
            TE.mapLeft((errors) => new BadRequestException(PR.failure(errors).join(", "))),
            TE.flatMap((req) => TE.tryCatch(async () => await create(req), E.toError)),
            TE.map((cert) => this.getCertificateSummary(cert.cert)),
            getOrThrow(),
        )()
    }

    private async deleteCertificateBySerial(
        unknownSerial: unknown,
        getCertificate: (serial: SerialNumberString) => Promise<Certificate | null>,
        deleteCertificate: (serial: SerialNumberString) => Promise<void>,
    ): Promise<void> {
        await F.pipe(
            // validate serial number
            TE.fromEither(validateRequestParam(unknownSerial, SerialNumberStringType)),
            // validate certificate exists and serial matches
            TE.tap((serial) =>
                F.pipe(
                    TE.tryCatch(async () => await getCertificate(serial), E.toError),
                    TE.filterOrElse(
                        (cert) => cert !== null && getCertificateSerialAsHexString(cert.cert) === serial,
                        () => new NotFoundException(null, "Certificate with given serial not found") as Error,
                    ),
                ),
            ),
            tryCatchF(
                (serial) => deleteCertificate(serial),
                (reason) => new InternalServerErrorException(`Cannot delete certificate: ${String(reason)}`),
            ),
        )()
    }

    private getCertificateSummary(cert: pkijs.Certificate): CertificateSummary {
        return {
            issuer: parsePkijsRdn(cert.issuer),
            hexSerialNumber: getCertificateSerialAsHexString(cert),
            publicKey: formatValueHex(cert.subjectPublicKeyInfo.subjectPublicKey.valueBlock.valueHexView),
            signature: formatValueHex(cert.signatureValue.valueBlock.valueHexView),
            subject: parsePkijsRdn(cert.subject),
            validNotAfter: cert.notAfter.value.getTime(),
            validNotBefore: cert.notBefore.value.getTime(),
        }
    }
}
