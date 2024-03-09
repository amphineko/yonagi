export type HashAlgorithm = "SHA-256" | "SHA-384" | "SHA-512"

export interface PkiMode {
    certHashAlg: HashAlgorithm
    key: EcKeyGenParams | RsaHashedKeyGenParams
}
