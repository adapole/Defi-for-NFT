import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllCard } from '../../prisma/user';

interface CircleCard {
	bin: string;
	network: string;
	id: string;
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
		const data = await getAllCard(address);
		console.log(data);

		const options = {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				Authorization: `Bearer ${token}`,
			},
		};
		// loop here to extract cards for all cardids
		if (data) {
			let values: CircleCard[] = [];
			for (let n = 0; n < data.cardid.length; n++) {
				const response = await fetch(
					`https://api-sandbox.circle.com/v1/cards/${data.cardid[n]}`,
					options
				);
				const name = await response.json();
				values.push({
					id: data.cardid[n],
					bin: name.data.bin,
					network: name.data.network,
				});
			}

			console.log(values);
			return res.status(201).json(values);
		}
		return res.status(201).json([{ network: 'null', bin: 'null', id: 'null' }]);
	} catch (error) {
		console.log(error);
		return res
			.status(500)
			.json([{ network: 'error', bin: 'error', id: 'error' }]);
	}
}
