import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
	req: NextApiRequest,
	res: NextApiResponse
) {
	if (req.method !== 'POST') {
		return res.status(405).json({ message: 'Method not allowed' });
	}

	const walletid = req.body.walletid;
	const token = process.env.BEARER_TOKEN;

	try {
		const options = {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				Authorization: `Bearer ${token}`,
			},
		};

		let values = [];

		const response = await fetch(
			`https://api-sandbox.circle.com/v1/wallets/${walletid}/addresses`,
			options
		);
		const name = await fetch(
			`https://api-sandbox.circle.com/v1/wallets/${walletid}`,
			options
		);
		const walletname = await name.json();
		const data = await response.json();
		if (data.data.length > 0) {
			for (let n = 0; n < data.data.length; n++) {
				values.push({
					address: data.data[n].address,
					chain: data.data[n].chain,
					name: walletname.data.description,
				});
			}

			console.log(values);
			return res.status(201).json(values);
		}
		values.push({ address: '', chain: '', name: walletname.data.description });
		return res.status(201).json(values);
	} catch (error) {
		console.log(error);
		return res
			.status(500)
			.json([{ address: 'error', chain: 'error', name: 'error' }]);
	}
}
