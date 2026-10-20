function bytesToBase64(bytes: Uint8Array): string {
  let text = ''
  bytes.forEach((byte) => {
    text += String.fromCharCode(byte)
  })
  return btoa(text)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function biometricAvailable(): Promise<boolean> {
  if (!window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export async function registerBiometric(): Promise<string | null> {
  if (!navigator.credentials) return null
  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'Pocket Note', id: location.hostname },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: 'pocketnote',
          displayName: 'Pocket Note',
        },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null
    if (!credential) return null
    return bytesToBase64(new Uint8Array(credential.rawId))
  } catch {
    return null
  }
}

export async function verifyBiometric(credentialId: string): Promise<boolean> {
  if (!navigator.credentials) return false
  try {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        timeout: 60_000,
        userVerification: 'required',
        rpId: location.hostname,
        allowCredentials: [{ type: 'public-key', id: base64ToBytes(credentialId) as BufferSource }],
      },
    })
    return Boolean(credential)
  } catch {
    return false
  }
}
