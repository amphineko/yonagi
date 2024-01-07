import assert from "node:assert"
import * as crypto from "node:crypto"

export function sha1(...messages: Buffer[]): Buffer {
    return crypto.createHash("sha1").update(Buffer.concat(messages)).digest()
}

/*
    String to node.js Buffer of UTF-16BE
*/
function encodePkcs12Password(password: string): Buffer {
    if (!password.endsWith("\0")) {
        password += "\0"
    }

    const utf16le = Buffer.from(password, "utf16le")
    return utf16le.swap16()
}

/*
    PKCS#12 key derivation function, as specified in RFC 7292 appendix B.2.
    @param {number} id - 1 = key, 2 = IV
    @param {number} n - desired key size in bytes (e.g. 24 for 3DES key or 8 for IV)
    @param {number} r - iteration count
    @param {number} u - as specified in RFC 7292
    @param {number} v - as specified in RFC 7292
    @param {function} h - hash function (e.g. sha1)
    @returns {Buffer} derived key
*/
function pkcs12DeriveKey(
    password: string,
    salt: Buffer,
    id: number,
    n: number,
    r: number,
    u: number,
    v: number,
    h: (...messages: Buffer[]) => Buffer,
): Buffer {
    const pwdUtf16Be = encodePkcs12Password(password)

    /*  1.  Construct a string, D (the "diversifier"), by concatenating v/8
            copies of ID.
    */
    assert(id === 1 || id === 2) // 1 = key, 2 = IV
    const D = Buffer.alloc(v, id)

    /*  2.  Concatenate copies of the salt together to create a string S of
            length v(ceiling(s/v)) bits (the final copy of the salt may be
            truncated to create S).  Note that if the salt is the empty
            string, then so is S.
    */
    const S = Buffer.alloc(v * Math.ceil(salt.length / v), salt)

    /*  3.  Concatenate copies of the password together to create a string P
            of length v(ceiling(p/v)) bits (the final copy of the password
            may be truncated to create P).  Note that if the password is the
            empty string, then so is P. 
    */
    const P = Buffer.alloc(v * Math.ceil(pwdUtf16Be.length / v), pwdUtf16Be)

    /*  4.  Set I=S||P to be the concatenation of S and P. */
    const I = Buffer.concat([S, P])

    /*  5.  Set c=ceiling(n/u). */
    const c = Math.ceil(n / u)

    /*  6.  For i=1, 2, ..., c, do the following: */
    const A: Buffer[] = []
    for (let i = 0; i < c; ++i) {
        /*  A.  Set A2=H^r(D||I). (i.e., the r-th hash of D||1,
                H(H(H(... H(D||I)))) 
        */
        let Ai = Buffer.concat([D, I])
        for (let j = 0; j < r; ++j) {
            Ai = h(Ai)
        }
        A.push(Ai)

        /*  B.  Concatenate copies of Ai to create a string B of length v
                bits (the final copy of Ai may be truncated to create B). 
        */
        const Bi = Buffer.alloc(v, Ai)

        /*  C.  Treating I as a concatenation I_0, I_1, ..., I_(k-1) of v-bit
                blocks, where k=ceiling(s/v)+ceiling(p/v), modify I by
                setting I_j=(I_j+B+1) mod 2^v for each j. 
        */
        const k = Math.ceil(S.length / v) + Math.ceil(P.length / v)
        for (let j = 0; j < k; ++j) {
            const Ij = I.subarray(j * v, (j + 1) * v)
            assert(Ij.length === v)

            let carry = 1
            for (let l = Ij.length - 1; l >= 0; --l) {
                const sum = Ij[l] + Bi[l] + carry
                Ij[l] = sum & 0xff
                carry = sum >> 8
            }
        }
    }

    /*  7.  Concatenate A_1, A_2, ..., A_c together to form a pseudorandom
            bit string, A.
        8.  Use the first n bits of A as the output of this entire process.
    */
    return Buffer.concat(A).subarray(0, n)
}

export function pkcs12DeriveSha1Key(password: string, salt: Buffer, id: number, n: number, r: number): Buffer {
    return pkcs12DeriveKey(password, salt, id, n, r, 160 / 8, 512 / 8, sha1)
}
