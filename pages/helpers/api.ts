import algosdk from 'algosdk';
import { IAssetData } from './types';

export enum ChainType {
	MainNet = 'mainnet',
	TestNet = 'testnet',
}

const mainNetClient = new algosdk.Algodv2('', 'https://algoexplorerapi.io', '');

const baseServer = 'https://testnet-algorand.api.purestake.io/ps2';
const baseServerIndexer = 'https://testnet-algorand.api.purestake.io/idx2';
const port = '';
const token = {
	'X-API-Key': process.env.NEXT_PUBLIC_PURESTAKE_API ?? '',
};

export const testNetClientalgod = new algosdk.Algodv2(token, baseServer, port);
export const testNetClientindexer = new algosdk.Indexer(
	token,
	baseServerIndexer,
	port
);

function clientForChain(chain: ChainType): algosdk.Algodv2 {
	switch (chain) {
		case ChainType.MainNet:
			return mainNetClient;
		case ChainType.TestNet:
			return testNetClientalgod;
		default:
			throw new Error(`Unknown chain type: ${chain}`);
	}
}
export async function tealProgramDispence(
	assetId: number,
	amount: number | bigint
) {
	let params = await testNetClientalgod.getTransactionParams().do();
	console.log(params);

	let data =
		'#pragma version 5 \nglobal ZeroAddress \ndup \ndup \ntxn RekeyTo \n== \nassert \ntxn CloseRemainderTo \n== \nassert \ntxn AssetCloseTo \n== \nassert \ntxn Fee \nglobal MinTxnFee \nint 2 \n* \n<= \ntxn TypeEnum \nint axfer \n== \n&& \ntxn XferAsset \narg_0 \nbtoi \n== \n&& \ntxn AssetAmount \narg_1 \nbtoi \n<= \n&& \nreturn';
	let results = await testNetClientalgod.compile(data).do();
	console.log('Hash = ' + results.hash);
	console.log('Result = ' + results.result);
	let myAccount = algosdk.mnemonicToSecretKey(
		process.env.TESTACCOUNT_MENMONIC ?? ''
	);

	let program = new Uint8Array(Buffer.from(results.result, 'base64'));
	//let round = params.firstRound + 172800;
	let args = dispenceUint8Args(assetId, amount);
	let lsig = new algosdk.LogicSigAccount(program, args);
	lsig.sign(myAccount.sk);
	let lsigs = lsig.toByte();
	//console.log(lsigs);
	return lsigs;
}
function dispenceUint8Args(assetId: number, amount: number | bigint) {
	return [algosdk.encodeUint64(assetId), algosdk.encodeUint64(amount)];
}
export async function tealProgramMake(amount: number) {
	let params = await testNetClientalgod.getTransactionParams().do();
	console.log(params);

	let data =
		'#pragma version 5 \nglobal ZeroAddress \ndup \ndup \ntxn RekeyTo \n== \nassert \ntxn CloseRemainderTo \n== \nassert \ntxn AssetCloseTo \n== \nassert \ntxn Fee \nint 0 \n== \ntxn XferAsset \narg_0 \nbtoi \n== \ntxn AssetAmount \narg_1 \nbtoi \n<= \ntxn LastValid \narg_2 \nbtoi \n<= \ngtxn 0 TypeEnum \nint appl \n== \ngtxn 0 ApplicationID \narg_3 \nbtoi \n== \n&& \n&& \n&& \n&& \n&& \nreturn';
	let results = await testNetClientalgod.compile(data).do();
	console.log('Hash = ' + results.hash);
	console.log('Result = ' + results.result);
	// AlgoSigner here

	let program = new Uint8Array(Buffer.from(results.result, 'base64'));
	//return program;
	let round = params.firstRound + 172800;
	let args = getUint8Args(amount, round);
	let lsig = new algosdk.LogicSigAccount(program, args);
	return lsig.toByte();
}

function getUint8Args(amount: number, round: number) {
	return [
		algosdk.encodeUint64(10458941),
		algosdk.encodeUint64(amount),
		algosdk.encodeUint64(round),
		algosdk.encodeUint64(79061945),
	];
}
export async function apiGetAccountAssets(
	chain: ChainType,
	address: string
): Promise<IAssetData[]> {
	const client = clientForChain(chain);

	const accountInfo = await client
		.accountInformation(address)
		.setIntDecoding(algosdk.IntDecoding.BIGINT)
		.do();

	const algoBalance = accountInfo.amount as bigint;
	const assetsFromRes: Array<{
		'asset-id': bigint;
		amount: bigint;
		creator: string;
		frozen: boolean;
	}> = accountInfo.assets;

	const assets: IAssetData[] = assetsFromRes.map(
		({ 'asset-id': id, amount, creator, frozen }) => ({
			id: Number(id),
			amount,
			creator,
			frozen,
			decimals: 0,
		})
	);

	assets.sort((a, b) => a.id - b.id);

	await Promise.all(
		assets.map(async (asset) => {
			const { params } = await client.getAssetByID(asset.id).do();
			asset.name = params.name;
			asset.unitName = params['unit-name'];
			asset.url = params.url;
			asset.decimals = params.decimals;
		})
	);

	assets.unshift({
		id: 0,
		amount: algoBalance,
		creator: '',
		frozen: false,
		decimals: 6,
		name: 'Algo',
		unitName: 'Algo',
	});

	return assets;
}

export async function apiGetTxnParams(
	chain: ChainType
): Promise<algosdk.SuggestedParams> {
	const params = await clientForChain(chain).getTransactionParams().do();
	return params;
}

export async function apiSubmitTransactions(
	chain: ChainType,
	stxns: Uint8Array[]
): Promise<number> {
	const { txId } = await clientForChain(chain).sendRawTransaction(stxns).do();
	return await waitForTransaction(chain, txId);
}

async function waitForTransaction(
	chain: ChainType,
	txId: string
): Promise<number> {
	const client = clientForChain(chain);

	let lastStatus = await client.status().do();
	let lastRound = lastStatus['last-round'];
	while (true) {
		const status = await client.pendingTransactionInformation(txId).do();
		if (status['pool-error']) {
			throw new Error(`Transaction Pool Error: ${status['pool-error']}`);
		}
		if (status['confirmed-round']) {
			return status['confirmed-round'];
		}
		lastStatus = await client.statusAfterBlock(lastRound + 1).do();
		lastRound = lastStatus['last-round'];
	}
}
