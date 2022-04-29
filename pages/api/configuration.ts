// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
export default async function handle(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const token = process.env.BEARER_TOKEN;
	const idempotencyKey = uuidv4();
	const options = {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			Authorization: `Bearer ${token}`,
		},
	};
	const optionsP = {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({
			idempotencyKey: idempotencyKey,
			description: 'Treasury 1',
		}),
	};
	//encryption/public
	//configuration wallets
	//console.log('Logging');
	try {
		switch (req.method) {
			case 'GET': {
				const response = await fetch(
					'https://api-sandbox.circle.com/v1/encryption/public',
					options
				);
				const data = await response.json();
				//console.log(data);
				return res.status(200).json(data);
			}
			case 'POST': {
				if (req.method !== 'POST') {
					return res.status(405).json({ message: 'Method not allowed' });
				}
				// Create a new post
				const { idempotencyKey, description } = req.body;

				let shouldRetry = true;
				while (shouldRetry) {
					try {
						const response = await fetch(
							'https://api-sandbox.circle.com/v1/wallets',
							optionsP
						);
						const data = await response.json();
						//console.log(data);
						shouldRetry = false;
						return res.status(201).json(data);
					} catch (error) {
						shouldRetry = true;
						console.log(error);
						return res.status(500).json({ message: 'error.message' });
					}
				}
			}
			default:
				break;
		}
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: 'error.message' });
	}

	/* return await fetch('https://api-sandbox.circle.com/v1/configuration', options)
		.then((response) => response.json())
		.then((response) => console.log(response))
		.catch((err) => console.error(err)); */
}
