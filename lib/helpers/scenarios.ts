import algosdk from 'algosdk';
import { apiGetTxnParams, ChainType } from './api';

const testAccounts = [
	algosdk.mnemonicToSecretKey(
		'cannon scatter chest item way pulp seminar diesel width tooth enforce fire rug mushroom tube sustain glide apple radar chronic ask plastic brown ability badge'
	),
	algosdk.mnemonicToSecretKey(
		'person congress dragon morning road sweet horror famous bomb engine eager silent home slam civil type melt field dry daring wheel monitor custom above term'
	),
	algosdk.mnemonicToSecretKey(
		'faint protect home drink journey humble tube clinic game rough conduct sell violin discover limit lottery anger baby leaf mountain peasant rude scene abstract casual'
	),
];

export function signTxnWithTestAccount(txn: algosdk.Transaction): Uint8Array {
	const sender = algosdk.encodeAddress(txn.from.publicKey);

	for (const testAccount of testAccounts) {
		if (testAccount.addr === sender) {
			return txn.signTxn(testAccount.sk);
		}
	}

	throw new Error(
		`Cannot sign transaction from unknown test account: ${sender}`
	);
}

export interface IScenarioTxn {
	txn: algosdk.Transaction;
	signers?: string[];
	authAddr?: string;
	message?: string;
}

export type ScenarioReturnType = IScenarioTxn[][];

export type Scenario = (
	chain: ChainType,
	address: string
) => Promise<ScenarioReturnType>;

export enum AssetTransactionType {
	Transfer = 'asset-transfer',
	OptIn = 'asset-opt-in',
	Close = 'asset-close',
}

function getAssetIndex(chain: ChainType, type: AssetTransactionType): number {
	if (chain === ChainType.MainNet) {
		if (type === AssetTransactionType.Transfer) {
			return 31566704; // USDC
		} else if (type === AssetTransactionType.Close) {
			return 672; // RotemCoin
		} else {
			return 312769; // Tether USDt
		}
	}

	if (type === AssetTransactionType.Transfer) {
		return 10458941; // USDC
	} else if (type === AssetTransactionType.Close) {
		return 180132; // testasset2
	} else {
		return 23324881; // Jina
	}
}

function getAppIndex(chain: ChainType): number {
	if (chain === ChainType.MainNet) {
		return 305162725;
	}

	if (chain === ChainType.TestNet) {
		return 22314999;
	}

	throw new Error(`App not defined for chain ${chain}`);
}

const singlePayTxn: Scenario = async (
	chain: ChainType,
	address: string
): Promise<ScenarioReturnType> => {
	const suggestedParams = await apiGetTxnParams(chain);

	const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
		from: address,
		to: testAccounts[0].addr,
		amount: 100000,
		note: new Uint8Array(Buffer.from('example note value')),
		suggestedParams,
	});

	const txnsToSign = [{ txn, message: 'This is a transaction message' }];
	return [txnsToSign];
};

const singleAssetOptInTxn: Scenario = async (
	chain: ChainType,
	address: string
): Promise<ScenarioReturnType> => {
	const suggestedParams = await apiGetTxnParams(chain);
	const assetIndex = getAssetIndex(chain, AssetTransactionType.OptIn);

	const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
		from: address,
		to: address,
		amount: 0,
		assetIndex,
		note: new Uint8Array(Buffer.from('example note value')),
		suggestedParams,
	});

	const txnsToSign = [{ txn }];
	return [txnsToSign];
};

const singleAssetTransferTxn: Scenario = async (
	chain: ChainType,
	address: string
): Promise<ScenarioReturnType> => {
	const suggestedParams = await apiGetTxnParams(chain);
	const assetIndex = getAssetIndex(chain, AssetTransactionType.Transfer);

	const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
		from: address,
		to: testAccounts[0].addr,
		amount: 1000000,
		assetIndex,
		note: new Uint8Array(Buffer.from('example note value')),
		suggestedParams,
	});

	const txnsToSign = [{ txn }];
	return [txnsToSign];
};

const singleAppOptIn: Scenario = async (
	chain: ChainType,
	address: string
): Promise<ScenarioReturnType> => {
	const suggestedParams = await apiGetTxnParams(chain);

	const appIndex = getAppIndex(chain);

	const txn = algosdk.makeApplicationOptInTxnFromObject({
		from: address,
		appIndex,
		note: new Uint8Array(Buffer.from('example note value')),
		appArgs: [Uint8Array.from([0]), Uint8Array.from([0, 1])],
		suggestedParams,
	});

	const txnsToSign = [{ txn }];
	return [txnsToSign];
};

const singleAppCall: Scenario = async (
	chain: ChainType,
	address: string
): Promise<ScenarioReturnType> => {
	const suggestedParams = await apiGetTxnParams(chain);

	const appIndex = getAppIndex(chain);

	const txn = algosdk.makeApplicationNoOpTxnFromObject({
		from: address,
		appIndex,
		note: new Uint8Array(Buffer.from('example note value')),
		appArgs: [Uint8Array.from([0]), Uint8Array.from([0, 1])],
		suggestedParams,
	});

	const txnsToSign = [{ txn }];
	return [txnsToSign];
};

export const scenarios: Array<{ name: string; scenario: Scenario }> = [
	{
		name: '1. Sign single pay txn',
		scenario: singlePayTxn,
	},
	{
		name: '2. Sign single asset opt-in txn',
		scenario: singleAssetOptInTxn,
	},

	{
		name: '11. Sign single app opt-in txn',
		scenario: singleAppOptIn,
	},
	{
		name: '12. Sign single app call txn',
		scenario: singleAppCall,
	},
];
