import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { addCard } from '../../prisma/user';
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
	const sessionId = req.body.sessionId;
	const expMonth = req.body.expMonth;
	const expYear = req.body.expYear;
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
			billingDetails: {
				name: 'Satoshi Nakamoto',
				city: 'Boston',
				country: 'US',
				line1: '100 Money Street',
				postalCode: '01234',
				district: 'MA',
			},
			metadata: {
				email: 'satoshi@circle.com',
				sessionId,
				ipAddress: detectedIp,
			},
			keyId,
			encryptedData,
			expMonth,
			expYear,
		}),
	};

	let shouldRetry = true;
	while (shouldRetry) {
		try {
			const response = await fetch(
				'https://api-sandbox.circle.com/v1/cards',
				optionsP
			);
			const data = await response.json();
			//console.log(data);
			await addCard(address, data.data.id);
			shouldRetry = false;
			return res.status(201).json(data);
		} catch (error) {
			shouldRetry = true;
			console.log(error);
			return res.status(500).json({ message: 'error.message' });
		}
	}
}
