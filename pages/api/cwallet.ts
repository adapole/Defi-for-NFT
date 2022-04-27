import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { createUser } from '../../prisma/user';

export default async function handle(
	req: NextApiRequest,
	res: NextApiResponse
) {
	if (req.method !== 'POST') {
		return res.status(405).json({ message: 'Method not allowed' });
	}

	const description = req.body.description;
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
			description,
		}),
	};

	let shouldRetry = true;
	while (shouldRetry) {
		try {
			const response = await fetch(
				'https://api-sandbox.circle.com/v1/wallets',
				optionsP
			);
			const data = await response.json();

			await createUser(address, data.data.walletId);
			shouldRetry = false;
			return res.status(201).json(data);
		} catch (error) {
			shouldRetry = true;
			console.log(error);
			return res.status(500).json({ message: 'error.message' });
		}
	}
}
