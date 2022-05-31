import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { addPayment } from '../../prisma/user';
import requestIp from 'request-ip';
import { keyId } from '../../lib/helpers/constants';

export default async function handle(
	req: NextApiRequest,
	res: NextApiResponse
) {
	if (req.method !== 'POST') {
		return res.status(405).json({ message: 'Method not allowed' });
	}
	const detectedIp = requestIp.getClientIp(req);
	// on localhost you'll see 127.0.0.1 if you're using IPv4
	// or ::1, ::ffff:127.0.0.1 if you're using IPv6
	console.log(detectedIp);

	const encryptedData = req.body.encryptedData;
	const amount = req.body.amount;
	const sessionId = req.body.sessionId;
	const cardId = req.body.cardId;
	const walletId = req.body.walletId;
	const address = req.body.address;
	const token = process.env.BEARER_TOKEN;
	const idempotencyKey = uuidv4();

	const optionsP = {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({
			idempotencyKey,
			metadata: {
				email: 'satoshi@circle.com',
				sessionId,
				ipAddress: detectedIp,
			},
			amount: { currency: 'USD', amount },
			autoCapture: true,
			source: { id: cardId, type: 'card' },
			verification: 'cvv',
			description: walletId,
			keyId,
			encryptedData,
		}),
	};

	let shouldRetry = true;
	while (shouldRetry) {
		try {
			const response = await fetch(
				'https://api-sandbox.circle.com/v1/payments',
				optionsP
			);
			const data = await response.json();
			console.log(data);
			await addPayment(address, data.data.id, walletId);
			shouldRetry = false;
			return res.status(201).json(data);
		} catch (error) {
			shouldRetry = true;
			console.log(error);
			return res.status(500).json({ message: 'error.message' });
		}
	}
}
