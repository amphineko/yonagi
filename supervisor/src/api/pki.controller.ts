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
import { CertificateInfo, CreateCertificateAuthorityRequestType } from "@yonagi/common/api/pki"
import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"
import * as PR from "io-ts/lib/PathReporter"
import * as pkijs from "pkijs"

import { ResponseInterceptor } from "./api.middleware"
import { Pki } from "../pki/pki"
import { parsePkijsRdn } from "../pki/utils"

@Controller("/api/v1/pki")
@UseInterceptors(ResponseInterceptor)
export class PkiController {
    constructor(@Inject(forwardRef(() => Pki)) private pki: Pki) {}

    @Get("/")
    async get() {
        const ca = (await this.pki.getCertificateAuthority())?.cert
        return {
            ca: ca ? this.getCertificateSummary(ca) : null,
        }
    }

    @Post("/ca")
    async createCertificateAuthority(@Body() body: unknown): Promise<CertificateInfo> {
        return await F.pipe(
            TE.fromEither(CreateCertificateAuthorityRequestType.decode(body)),
            TE.mapLeft((errors) => new BadRequestException(PR.failure(errors).join(", "))),
            TE.flatMap(({ subject, validity }) =>
                TE.tryCatch(async () => await this.pki.createCertificateAuthority(subject, validity), E.toError),
            ),
            TE.map((ca) => this.getCertificateSummary(ca.cert)),
            TE.getOrElse((error) => {
                throw error
            }),
        )()
    }

    @Delete("/ca/:serial")
    async deleteCertificateAuthority(@Param("serial") u: unknown): Promise<void> {
        const serial = F.pipe(
            t.string.decode(u),
            E.fold(
                (errors) => {
                    throw new BadRequestException(PR.failure(errors).join(", "))
                },
                (u) => u,
            ),
        )

        const ca = await this.pki.getCertificateAuthority()
        if (!ca) {
            throw new NotFoundException(null, "CA not found")
        }
        if (this.getCertificateSerial(ca.cert) !== serial) {
            throw new NotFoundException(null, "CA with given serial not found")
        }

        await this.pki.deleteCertificateAuthority()
    }

    private getCertificateSerial(cert: pkijs.Certificate): string {
        return this.formatValueHex(cert.serialNumber.valueBlock.valueHexView)
    }

    private getCertificateSummary(cert: pkijs.Certificate): CertificateInfo {
        return {
            issuer: parsePkijsRdn(cert.issuer),
            hexSerialNumber: this.getCertificateSerial(cert),
            publicKey: this.formatValueHex(cert.subjectPublicKeyInfo.subjectPublicKey.valueBlock.valueHexView),
            signature: this.formatValueHex(cert.signatureValue.valueBlock.valueHexView),
            subject: parsePkijsRdn(cert.subject),
            validNotAfter: cert.notAfter.value.getTime(),
            validNotBefore: cert.notBefore.value.getTime(),
        }
    }

    private formatValueHex(buffer: Uint8Array): string {
        return Array.from(buffer)
            .map((v) => v.toString(16).padStart(2, "0"))
            .join(":")
    }
}
