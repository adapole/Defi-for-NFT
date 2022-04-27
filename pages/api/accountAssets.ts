import type { NextApiRequest, NextApiResponse } from 'next';
import { testNetClientindexer } from '../../lib/helpers/api';
import { IAssetData } from '../../lib/helpers/types';

export default async function handle(
	req: NextApiRequest,
	res: NextApiResponse
) {
	if (req.method !== 'POST') {
		return res.status(405).json({ message: 'Method not allowed' });
	}

	const address = req.body.address;

	try {
		const data = await testNetClientindexer.lookupAccountAssets(address).do();
		//console.log(data);

		// loop here to extract name for all assetId
		if (data) {
			let values: IAssetData[] = [];
			for (let n = 0; n < data.assets.length; n++) {
				const assetId = data.assets[n]['asset-id'];
				const assetInfo = await testNetClientindexer
					.lookupAssetByID(assetId)
					.do();
				values.push({
					id: assetId,
					amount: 0,
					creator: assetInfo.asset.params['creator'],
					frozen: assetInfo.asset.params['default-frozen'],
					decimals: assetInfo.asset.params['decimals'],
					name: assetInfo.asset.params['name'],
					unitName: assetInfo.asset.params['unit-name'],
				});
			}

			console.log(values);
			//console.log(JSON.stringify(values));
			return res.status(201).json(values);
		}
		return res.status(201).json([
			{
				id: 77141623,
				amount: 0,
				creator: '',
				frozen: false,
				decimals: 0,
				name: 'Lofty jina property',
				unitName: 'LFT-jina',
			},
		]);
	} catch (error) {
		console.log(error);
		return res.status(500).json([
			{
				id: 0,
				amount: 0,
				creator: '',
				frozen: false,
				decimals: 6,
				name: 'Algo',
				unitName: 'Algo',
			},
		]);
	}
}
