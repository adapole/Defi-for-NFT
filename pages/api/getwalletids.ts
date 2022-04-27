import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllWallet } from '../../prisma/user';
interface CircleWallet {
	walletid: string;
	name: string;
}

export default async function handle(
	req: NextApiRequest,
	res: NextApiResponse
) {
	if (req.method !== 'POST') {
		return res.status(405).json({ message: 'Method not allowed' });
	}

	const address = req.body.address;
	const token = process.env.BEARER_TOKEN;

	try {
		const data = await getAllWallet(address);
		console.log(data);

		const options = {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				Authorization: `Bearer ${token}`,
			},
		};
		// loop here to extract name for all walletids
		if (data) {
			let values: CircleWallet[] = [];
			for (let n = 0; n < data.walletid.length; n++) {
				const response = await fetch(
					`https://api-sandbox.circle.com/v1/wallets/${data.walletid[n]}`,
					options
				);
				const name = await response.json();
				values.push({
					walletid: data.walletid[n],
					name: name.data.description,
				});
			}

			console.log(values);
			return res.status(201).json(values);
		}
		return res.status(201).json([{ walletid: 'null', name: 'null' }]);
	} catch (error) {
		console.log(error);
		return res.status(500).json([{ walletid: 'error', name: 'error' }]);
	}
}
