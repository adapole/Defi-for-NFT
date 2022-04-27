import { createMessage, encrypt, readKey } from 'openpgp';
import { keyId, publicKey } from './constants';

// Object to be encrypted
export interface CardDetails {
	number?: string; // required when storing card details
	cvv?: string; // required when cardVerification is set to cvv
}

// Encrypted result
interface EncryptedValue {
	encryptedData: string;
	keyId: string;
}

/**
 * Encrypt card data function
 */
export async function encryptCard(
	dataToEncrypt: CardDetails
): Promise<EncryptedValue> {
	const decodedPublicKey = await readKey({
		armoredKey: Buffer.from(publicKey, 'base64').toString(),
	});

	const message = await createMessage({
		text: JSON.stringify(dataToEncrypt),
	});

	return encrypt({
		message,
		encryptionKeys: decodedPublicKey,
	}).then((ciphertext) => {
		return {
			encryptedData: Buffer.from(ciphertext.toString()).toString('base64'),
			keyId,
		};
	});
}
