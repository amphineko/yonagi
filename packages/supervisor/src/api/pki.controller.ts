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
} from "@nestjs/common"
import {
    CertificateSummary,
    CertificateSummaryType,
    CreateCertificateRequestType,
    ExportClientCertificateP12RequestType,
    GetPkiSummaryResponse,
} from "@yonagi/common/api/pki"
import { SerialNumberStringType } from "@yonagi/common/types/pki/SerialNumberString"
import { filterNullish, getOrThrow, tryCatchF } from "@yonagi/common/utils/TaskEither"
import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"
import * as PR from "io-ts/lib/PathReporter"

import { ResponseInterceptor } from "./api.middleware"
import { EncodeResponseWith, validateRequestParam } from "./common"
import { Config } from "../config"
import { Certificate, CertificateAuthorityState, ClientCertificateState, ServerCertificateState } from "../pki"
import { PkijsCertificate } from "../pki/pkijs"
import { convertPkijsRdnToRdn } from "../pki/pkijs/utils"

@Controller("/api/v1/pki")
@UseInterceptors(ResponseInterceptor)
export class PkiController {
    constructor(
        @Inject(CertificateAuthorityState) private ca: CertificateAuthorityState,
        @Inject(ServerCertificateState) private server: ServerCertificateState,
        @Inject(ClientCertificateState) private clients: ClientCertificateState,
        @Inject(Config) private config: Config,
    ) {}

    @Get("/")
    @EncodeResponseWith(GetPkiSummaryResponse)
    async get(): Promise<GetPkiSummaryResponse> {
        const ca = await this.ca.get()
        const server = await this.server.get()
        const clients = await this.clients.all()
        return {
            ca: ca ? this.getCertificateSummary(ca) : undefined,
            server: server ? this.getCertificateSummary(server) : undefined,
            clients: clients.map((c) => this.getCertificateSummary(c)),
        }
    }

    @Post("/ca")
    @EncodeResponseWith(CertificateSummaryType)
    async createCertificateAuthority(@Body() body: unknown): Promise<CertificateSummary> {
        return await this.createCertificateFromRequest(
            body,
            CreateCertificateRequestType,
            async ({ subject, validity }, keyGenParams) => await this.ca.create(subject, validity, keyGenParams),
        )
    }

    @Delete("/ca/:serial")
    @EncodeResponseWith(t.undefined)
    revokeCertificateAuthority(@Param("serial") unknownSerial: unknown): Promise<void> {
        return this.revokeCertificateByUnknownSerial(unknownSerial, (serial) => this.ca.revoke(serial))
    }

    @Post("/server")
    @EncodeResponseWith(CertificateSummaryType)
    async createServerCertificate(@Body() body: unknown): Promise<CertificateSummary> {
        return await this.createCertificateFromRequest(
            body,
            CreateCertificateRequestType,
            async ({ subject, validity }, keyGenParams) => await this.server.create(subject, validity, keyGenParams),
        )
    }

    @Delete("/server/:serial")
    @EncodeResponseWith(t.undefined)
    revokeServerCertificate(@Param("serial") u: unknown): Promise<void> {
        return this.revokeCertificateByUnknownSerial(u, (serial) => this.server.revoke(serial))
    }

    @Post("/clients")
    @EncodeResponseWith(CertificateSummaryType)
    async createClientCertificate(@Body() body: unknown): Promise<CertificateSummary> {
        return await this.createCertificateFromRequest(
            body,
            CreateCertificateRequestType,
            async ({ subject, validity }, keyGenParams) => await this.clients.create(subject, validity, keyGenParams),
        )
    }

    @Delete("/clients/:serial")
    @EncodeResponseWith(t.undefined)
    deleteClientCertificate(@Param("serial") serial: unknown): Promise<void> {
        return this.revokeCertificateByUnknownSerial(serial, (serial) => this.clients.revokeBySerial(serial))
    }

    @Post("/clients/:serial/p12")
    @EncodeResponseWith(t.string)
    async exportClientCertificateP12(@Param("serial") serial: unknown, @Body() body: unknown): Promise<string> {
        return await F.pipe(
            E.Do,
            E.bindW("serial", () => validateRequestParam(serial, SerialNumberStringType)),
            E.bindW("options", () => validateRequestParam(body, ExportClientCertificateP12RequestType)),
            TE.fromEither,
            TE.bindW("cert", ({ serial }) =>
                F.pipe(
                    TE.tryCatch(
                        () => this.clients.getBySerial(serial),
                        (reason) => new InternalServerErrorException(`Cannot get certificate: ${String(reason)}`),
                    ),
                    filterNullish(() => new NotFoundException(null, "Certificate with given serial not found")),
                ),
            ),
            TE.bindW("ca", () =>
                F.pipe(
                    TE.tryCatch(
                        () => this.ca.get(),
                        (reason) => new InternalServerErrorException(`Cannot get CA certificate: ${String(reason)}`),
                    ),
                    filterNullish(
                        () => new NotFoundException(null, "Cannot find CA certificate to add to the PKCS#12"),
                    ),
                ),
            ),
            TE.bindW("server", () =>
                F.pipe(
                    TE.tryCatch(
                        () => this.server.get(),
                        (reason) =>
                            new InternalServerErrorException(`Cannot get server certificate: ${String(reason)}`),
                    ),
                    filterNullish(
                        () => new NotFoundException(null, "Cannot find server certificate to add to the PKCS#12"),
                    ),
                ),
            ),
            TE.flatMap(({ ca, cert, options: { password }, server }) =>
                TE.tryCatch(
                    () => cert.exportAsPkcs12(password, [ca, server]),
                    (reason) => new InternalServerErrorException(`Cannot export certificate: ${String(reason)}`),
                ),
            ),
            TE.map((p12) => Buffer.from(p12).toString("base64")),
            getOrThrow(),
        )()
    }

    private createCertificateFromRequest<T>(
        body: unknown,
        decoder: t.Decoder<unknown, T>,
        create: (req: T, keyGenParams: EcKeyGenParams | RsaHashedKeyGenParams) => Promise<Certificate>,
    ) {
        return F.pipe(
            TE.fromEither(decoder.decode(body)),
            TE.mapLeft((errors) => new BadRequestException(PR.failure(errors).join(", "))),
            TE.flatMap((req) => TE.tryCatch(async () => await create(req, this.config.pkiMode.key), E.toError)),
            TE.map((cert) => this.getCertificateSummary(cert)),
            getOrThrow(),
        )()
    }

    private getCertificateSummary(cert: Certificate): CertificateSummary {
        if (!(cert instanceof PkijsCertificate)) {
            throw new Error("Certificate is not a PkijsCertificate and unsupported for summary")
        }
        const { metadata, pkijsCertificate: pkijsCert } = cert

        return {
            ...metadata,
            issuer: convertPkijsRdnToRdn(pkijsCert.issuer),
            publicKey: formatPkijsHexView(pkijsCert.subjectPublicKeyInfo.subjectPublicKey.valueBlock.valueHexView),
            signature: formatPkijsHexView(pkijsCert.signatureValue.valueBlock.valueHexView),
        }
    }

    private revokeCertificateByUnknownSerial(serial: unknown, revoke: (serial: string) => Promise<void>) {
        return F.pipe(
            validateRequestParam(serial, SerialNumberStringType),
            TE.fromEither,
            tryCatchF(
                (serial) => revoke(serial),
                (reason) => new InternalServerErrorException(`Cannot revoke certificate: ${String(reason)}`),
            ),
            getOrThrow(),
        )()
    }
}

function formatPkijsHexView(hexView: ArrayBuffer): string {
    return Buffer.from(hexView).toString("hex").toLowerCase()
}
