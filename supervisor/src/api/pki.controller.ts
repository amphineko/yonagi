import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Inject,
    NotFoundException,
    Param,
    Post,
    UseInterceptors,
    forwardRef,
} from "@nestjs/common"
import { CertificateSummary, CreateCertificateRequestType, GetPkiSummaryResponse } from "@yonagi/common/api/pki"
import { SerialNumberString, SerialNumberStringType } from "@yonagi/common/pki"
import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"
import * as PR from "io-ts/lib/PathReporter"
import * as pkijs from "pkijs"

import { ResponseInterceptor } from "./api.middleware"
import { EncodeResponseWith } from "./common"
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
    async createCertificateAuthority(@Body() body: unknown): Promise<CertificateSummary> {
        return await this.createCertificateFromRequest(body, CreateCertificateRequestType, ({ subject, validity }) =>
            this.pki.createCertificateAuthority(subject, validity),
        )
    }

    @Delete("/ca/:serial")
    async deleteCertificateAuthority(@Param("serial") u: unknown): Promise<void> {
        await this.deleteCertificateBySerial(
            u,
            () => this.pki.getCertificateAuthority(),
            () => this.pki.deleteCertificateAuthority(),
        )
    }

    @Post("/server")
    async createServerCertificate(@Body() body: unknown): Promise<CertificateSummary> {
        return await this.createCertificateFromRequest(body, CreateCertificateRequestType, ({ subject, validity }) =>
            this.pki.createServerCertificate(subject, validity),
        )
    }

    @Delete("/server/:serial")
    async deleteServerCertificate(@Param("serial") u: unknown): Promise<void> {
        await this.deleteCertificateBySerial(
            u,
            () => this.pki.getServerCertificate(),
            () => this.pki.deleteServerCertificate(),
        )
    }

    @Post("/clients")
    async createClientCertificate(@Body() body: unknown): Promise<CertificateSummary> {
        return await this.createCertificateFromRequest(body, CreateCertificateRequestType, ({ subject, validity }) =>
            this.pki.createClientCertificate(subject, validity),
        )
    }

    @Delete("/clients/:serial")
    async deleteClientCertificate(@Param("serial") serial: unknown): Promise<void> {
        await this.deleteCertificateBySerial(
            serial,
            (serial) => this.pki.getClientCertificate(serial),
            (serial) => this.pki.deleteClientCertificate(serial),
        )
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
            TE.getOrElse((error) => {
                throw error
            }),
        )()
    }

    private async deleteCertificateBySerial(
        unknownSerial: unknown,
        getCertificate: (serial: SerialNumberString) => Promise<Certificate | null>,
        deleteCertificate: (serial: SerialNumberString) => Promise<void>,
    ): Promise<void> {
        await F.pipe(
            // validate serial number
            SerialNumberStringType.decode(unknownSerial),
            E.mapLeft((errors) => new BadRequestException(PR.failure(errors).join(", "))),
            TE.fromEither,
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
            TE.flatMap((serial) => TE.tryCatch(() => deleteCertificate(serial), E.toError)),
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
