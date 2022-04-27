import Head from 'next/head';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
	ChevronLeftIcon,
	ChevronDoubleRightIcon,
	XIcon,
	ChevronRightIcon,
} from '@heroicons/react/solid';
import React, {
	useCallback,
	useEffect,
	useReducer,
	useRef,
	useState,
} from 'react';
import { useRouter } from 'next/router';
import { formatBigNumWithDecimals } from '../lib/helpers/utilities';
import {
	IAssetData,
	IWalletTransaction,
	SignTxnParams,
} from '../lib/helpers/types';
import algosdk from 'algosdk';
import {
	ScenarioReturnType,
	Scenario,
	AssetTransactionType,
	IScenarioTxn,
} from '../lib/helpers/scenarios';
import {
	ChainType,
	apiGetTxnParams,
	apiSubmitTransactions,
	apiGetAccountAssets,
	tealProgramDispence,
	testNetClientindexer,
	testNetClientalgod,
} from '../lib/helpers/api';
import BalanceAsset from '../components/BalanceAsset';
import { formatJsonRpcRequest } from '@json-rpc-tools/utils';
import WalletConnect from '@walletconnect/client';
import Modal from './Modal';
import Loader from './Loader';
import SelectAssets from './SelectAssets';
import dynamic from 'next/dynamic';
import { create } from 'ipfs-http-client';
import { assetsContext } from '../lib/helpers/assetsContext';
import {
	APP_ID,
	DUSD,
	LiquidateID,
	NFTColl,
	USDC,
} from '../lib/helpers/constants';
import MyAlgoConnect from '@randlabs/myalgo-connect';
import Faucets from './Faucets';
import Fiat from './Fiat';
import AsyncSelect from 'react-select/async';

const DynamicComponentWithNoSSR = dynamic(() => import('./MyalgoConnect'), {
	ssr: false,
});

interface IResult {
	method: string;
	body: Array<
		Array<{
			txID: string;
			signingAddress?: string;
			signature: string;
		} | null>
	>;
}

const jusdAssetTransferTxn: Scenario = async (
	chain: ChainType,
	address: string
): Promise<ScenarioReturnType> => {
	const suggestedParams = await apiGetTxnParams(chain);
	const transferAssetIndex = 79077841;
	const optInAssetIndex = transferAssetIndex;

	const txn1 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
		from: address,
		to: address,
		amount: 0,
		assetIndex: optInAssetIndex,
		note: new Uint8Array(Buffer.from('Opt-in to jUSD')),
		suggestedParams,
	});

	const txn2 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
		from: 'XCXQVUFRGYR5EKDHNVASR6PZ3VINUKYWZI654UQJ6GA5UVVUHJGM5QCZCY',
		to: address,
		amount: 10000000,
		assetIndex: transferAssetIndex,
		note: new Uint8Array(Buffer.from('dispencer 10 jUSD')),
		suggestedParams,
	});

	const txnsToSign = [{ txn: txn1 }, { txn: txn2, signers: [] }];

	algosdk.assignGroupID(txnsToSign.map((toSign) => toSign.txn));
	return [txnsToSign];
};
const LFTAssetTransferTxn: Scenario = async (
	chain: ChainType,
	address: string
): Promise<ScenarioReturnType> => {
	const suggestedParams = await apiGetTxnParams(chain);

	const txn1 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
		from: address,
		to: address,
		amount: 0,
		assetIndex: 77141623,
		note: new Uint8Array(Buffer.from('Opt-in to LFT-Jina')),
		suggestedParams,
	});

	const txn2 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
		from: 'XCXQVUFRGYR5EKDHNVASR6PZ3VINUKYWZI654UQJ6GA5UVVUHJGM5QCZCY',
		to: address,
		amount: 4,
		assetIndex: 77141623,
		note: new Uint8Array(Buffer.from('dispencer 4 LFT-Jina')),
		suggestedParams,
	});

	const txnsToSign = [{ txn: txn1 }, { txn: txn2, signers: [] }];

	algosdk.assignGroupID(txnsToSign.map((toSign) => toSign.txn));
	return [txnsToSign];
};
const scenarios1: Array<{ name: string; scenario1: Scenario }> = [
	{
		name: 'Dispense',
		scenario1: jusdAssetTransferTxn,
	},
];
const scenarios2: Array<{ name: string; scenario1: Scenario }> = [
	{
		name: 'Dispense',
		scenario1: LFTAssetTransferTxn,
	},
];
const singleAppOptIn: Scenario = async (
	chain: ChainType,
	address: string
): Promise<ScenarioReturnType> => {
	const suggestedParams = await apiGetTxnParams(chain);

	const appIndex = 77600054;
	const assetID = algosdk.encodeUint64(77141623);
	const amount = algosdk.encodeUint64(3);
	// change appIndex to BigEndian
	const txn = algosdk.makeApplicationOptInTxnFromObject({
		from: address,
		appIndex,
		note: new Uint8Array(Buffer.from('OptIn App')),
		appArgs: [Uint8Array.from(Buffer.from('borrow')), assetID, amount],
		suggestedParams,
	});

	const txnsToSign = [{ txn }];
	return [txnsToSign];
};
interface iOption {
	label: string;
	value: string;
}

export function replacer(key: any, value: any) {
	if (key === 'amount') {
		return value.toString();
	}
	return value;
}
export default function Body(props: {
	assets: IAssetData[];
	connector: WalletConnect | null;
	address: string;
	chain: ChainType;
	wc: boolean;
	mconnector: MyAlgoConnect | null;
}) {
	const { assets, connector, address, chain, wc, mconnector } = props;
	//console.log(lsa);
	const [makeLogicSig, setMakeLogicSig] = useState(new Uint8Array());
	const [borrowLogicSig, setBorrowLogicSig] = useState(new Uint8Array());
	const [addressLogicSig, setAddressLogicSig] = useState('');
	const [switcher, setSwitcher] = useState(0);
	const [jusdLogicSig, setJusdLogicSig] = useState(new Uint8Array());
	const [selectedNFT, setSelectedNFT] = useState<iOption>({
		value:
			'{"id":77141623,"amount":0,"creator":"XCXQVUFRGYR5EKDHNVASR6PZ3VINUKYWZI654UQJ6GA5UVVUHJGM5QCZCY","frozen":false,"decimals":0,"name":"Lofty jina property","unitName":"LFT-jina"}',
		label: 'LFT-jina',
	});

	function writeUserData(
		userId: Number,
		name: string,
		email: string,
		imageUrl: Uint8Array
	) {
		/* const db = getDatabase(firebase);
		set(ref(db, 'users/' + userId), {
			username: name,
			email: email,
			profile_picture: imageUrl,
		}); */
	}
	function readUserData(userId: Number): Uint8Array {
		/* const dbRef = ref(getDatabase(firebase));
		get(child(dbRef, `users/${userId}`))
			.then((snapshot) => {
				if (snapshot.exists()) {
					console.log(snapshot.val().profile_picture);
					let myval: Uint8Array = snapshot.val().profile_picture;
					if (userId === 2) {
						setMakeLogicSig(myval);
					}
					if (userId === 1) {
						setJusdLogicSig(myval);
					}
					//console.log(makeLogicSig);
				} else {
					console.log('No data available');
					return;
				}
			})
			.catch((error) => {
				console.error(error);
			}); */
		return makeLogicSig;
	}
	function readBorrowData(userId: string): Uint8Array {
		/* const dbRef = ref(getDatabase(firebase));
		get(child(dbRef, `users/${userId}`))
			.then((snapshot) => {
				if (snapshot.exists()) {
					console.log(snapshot.val().profile_picture);
					let lsaval: Uint8Array = snapshot.val().uint8_lsa;
					let addval: string = snapshot.val().useraddress;
					setAddressLogicSig(addval);
					setBorrowLogicSig(lsaval);
					console.log(lsaval);
					console.log(addval);
				} else {
					console.log('No data available');
					return;
				}
			})
			.catch((error) => {
				console.error(error);
			}); */
		return borrowLogicSig;
	}
	const ipfs = create({
		host: 'ipfs.infura.io',
		port: 5001,
		protocol: 'https',
	});
	const borrowIndexer = async (assetid: Number, amount: number) => {
		toast.info('Looking for Lenders...', {
			position: 'top-right',
			autoClose: false,
			hideProgressBar: false,
			closeOnClick: true,
			pauseOnHover: true,
			draggable: true,
		});
		const accountsArray = await testNetClientindexer
			.searchAccounts()
			.applicationID(APP_ID)
			.do();

		console.log(accountsArray.accounts);

		let numAccounts = accountsArray.accounts.length;

		let foundId: boolean = false;
		let proceedToBorrow: boolean = false;
		outer: for (let i = 0; i < numAccounts; i++) {
			let add = accountsArray.accounts[i]['address'];

			let accountInfoResponse = await testNetClientindexer
				.lookupAccountAppLocalStates(add)
				.applicationID(APP_ID)
				.do();

			if (
				accountInfoResponse['apps-local-states'][0]['key-value'] != undefined
			) {
				console.log("User's local state: " + add);

				for (
					let n = 0;
					n < accountInfoResponse['apps-local-states'][0]['key-value'].length;
					n++
				) {
					console.log(
						accountInfoResponse['apps-local-states'][0]['key-value'][n]
					);
					let kv = accountInfoResponse['apps-local-states'][0]['key-value'];
					let ky = kv[n]['key'];

					if (ky === 'eGlkcw==') {
						// Extract bytes and compare to assetid
						let lvr = kv[n]['value']['bytes'];
						console.log(lvr);

						//console.log(buf.readBigUInt64BE(0));

						let buff = Buffer.from(lvr, 'base64');
						console.log(buff.length);
						let values: Array<number> = [];
						for (let n = 0; n < buff.length; n = n + 8) {
							// Array offset, then check value
							console.log('Checkin For: ' + n);
							values.push(buff.readUIntBE(n, 8));
						}
						//const value = Number(buff.readBigUInt64BE(0)); //readUIntBE(0, 8)
						//console.log(value);
						for (const va of values) {
							if (assetid === va) {
								foundId = true;
								console.log('Found Id');
								break;
							}
						}
					}
					let buff = Buffer.from(ky, 'base64').toString('utf-8');
					console.log(buff);

					if (foundId) {
						// Filter by lvr and aamt

						let lastValid: boolean = false;
						for (
							let n = 0;
							n <
							accountInfoResponse['apps-local-states'][0]['key-value'].length;
							n++
						) {
							let kv = accountInfoResponse['apps-local-states'][0]['key-value'];
							let ky = kv[n]['key'];
							if (ky === 'bHZy') {
								// Check last valid round, lvr

								let kyv = kv[n]['value']['uint'];
								const suggestedParams = await apiGetTxnParams(
									ChainType.TestNet
								);
								if (suggestedParams.lastRound < kyv) {
									console.log('Checking for lvr here');
									lastValid = true;
								}
							}
							if (ky === 'YWFtdA==') {
								if (lastValid) {
									// Check amount allowed, then check available amount in account
									let kyv = kv[n]['value']['uint'];
									console.log(kyv);
									// Check assetId balance

									const accountAssetInfo = await testNetClientalgod
										.accountAssetInformation(add, 10458941)
										.do();

									const assetBalance =
										accountAssetInfo['asset-holding']['amount'];
									console.log(assetBalance);
									const amountborrowing = Number(
										Math.floor(amount).toString() + '000000'
									);
									if (assetBalance >= kyv && kyv > amountborrowing) {
										// If aamt is equal or greater than available balance
										console.log('Proceed to borrowing');
										proceedToBorrow = true;
										break;
									}
								}
							}
						}
						if (proceedToBorrow) {
							for (
								let n = 0;
								n <
								accountInfoResponse['apps-local-states'][0]['key-value'].length;
								n++
							) {
								let kv =
									accountInfoResponse['apps-local-states'][0]['key-value'];
								let ky = kv[n]['key'];
								if (ky === 'bHNh') {
									let lsa = kv[n]['value']['bytes'];
									let buff = Buffer.from(lsa, 'base64').toString('utf-8');
									console.log(buff);
									console.log(add);
									const lg = await borrowGetLogic(buff);
									console.log(lg);
									setBorrowLogicSig(lg);
									setAddressLogicSig(add);
									toast.dismiss();
									toast.success('Found Lender!', {
										position: 'top-right',
										autoClose: 5000,
										hideProgressBar: false,
										closeOnClick: true,
										pauseOnHover: true,
										draggable: true,
									});
									break outer;
								}
							}
							break;
						}
					}
				}
			}
		}
		if (!proceedToBorrow) {
			toast.error('No lenders found! Try again', {
				position: 'top-right',
				autoClose: false,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
			});
		}
	};
	/**
	 * Returns Uint8array of LogicSig from ipfs, throw error
	 * @param ipfsPath hash string of ipfs path
	 */
	const borrowGetLogic = async (ipfsPath: string): Promise<Uint8Array> => {
		const chunks = [];
		for await (const chunk of ipfs.cat(ipfsPath)) {
			chunks.push(chunk);
		}
		//console.log(chunks);
		//setBorrowLogicSig(chunks[0]);
		return chunks[0];
	};
	const [newAmount, setNewAmount] = useState('');
	const [newAmount2, setNewAmount2] = useState('');
	const [newAmount3, setNewAmount3] = useState('');
	const [userInput, setUserInput] = useState(0);
	const [borrowing, setBorrowing] = useState(0);
	const [expireday, setExpireday] = useState(0);

	const borrowAppCall: Scenario = async (
		chain: ChainType,
		address: string
	): Promise<ScenarioReturnType> => {
		const suggestedParams = await apiGetTxnParams(chain);

		/* const borrowLogic = await borrowGetLogic(
			'QmaGYNdQaj2cygMxxDQqJie3vfAJzCa1VBstReKY1ZuYjK'
		);
		console.log(borrowLogic); */

		const amountborrowing = Number(Math.floor(borrowing).toString() + '000000'); //Math.floor(borrowAmount(userInput)).toString() + '000000'
		console.log(amountborrowing);
		console.log(userInput);
		console.log(addressLogicSig);
		console.log('Switcher: ' + switcher);
		console.log(borrowLogicSig);
		//const bigIntValUserInput = Number(userInput);
		//const amountUserInput = Number(bigIntValUserInput.toString() + '000000');

		const assetID = algosdk.encodeUint64(NFTSelected.id);
		//const amount64 = algosdk.encodeUint64(1);
		const Useramount64 = algosdk.encodeUint64(userInput);
		// change appIndex to BigEndian
		suggestedParams.flatFee = true;
		suggestedParams.fee = 4000;
		const txn1 = algosdk.makeApplicationNoOpTxnFromObject({
			from: address,
			appIndex: APP_ID,
			appArgs: [Uint8Array.from(Buffer.from('borrow')), assetID, Useramount64],
			foreignApps: [LiquidateID],
			foreignAssets: [NFTSelected.id, DUSD],
			accounts: [addressLogicSig], //Lender address
			suggestedParams,
		});
		suggestedParams.fee = 0;
		const txn2 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
			from: addressLogicSig, //Lender address
			to: address,
			amount: amountborrowing,
			assetIndex: USDC,
			suggestedParams,
		});
		const txnsToSign = [{ txn: txn1 }, { txn: txn2, signers: [] }];
		algosdk.assignGroupID(txnsToSign.map((toSign) => toSign.txn));

		return [txnsToSign];
	};
	const claimUSDCcall: Scenario = async (
		chain: ChainType,
		address: string
	): Promise<ScenarioReturnType> => {
		const suggestedParams = await apiGetTxnParams(chain);

		const appIndex = 79061945;

		const bigIntVal = Number(userInput);
		const amount = Number(bigIntVal.toString() + '000000');
		console.log(amount);
		//const assetID = algosdk.encodeUint64(77141623);
		//const amount64 = algosdk.encodeUint64(1);
		// change appIndex to BigEndian
		const txn1 = algosdk.makeApplicationNoOpTxnFromObject({
			from: address,
			appIndex,
			appArgs: [Uint8Array.from(Buffer.from('claim'))],
			foreignAssets: [10458941],
			suggestedParams,
		});
		suggestedParams.flatFee = true;
		suggestedParams.fee = 2000;
		const txn2 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
			from: address,
			to: algosdk.getApplicationAddress(appIndex),
			amount: amount,
			assetIndex: 79077841,
			suggestedParams,
		});

		const txnsToSign = [{ txn: txn1 }, { txn: txn2 }];
		algosdk.assignGroupID(txnsToSign.map((toSign) => toSign.txn));
		return [txnsToSign];
	};
	const repayUSDCcall: Scenario = async (
		chain: ChainType,
		address: string
	): Promise<ScenarioReturnType> => {
		const suggestedParams = await apiGetTxnParams(chain);

		const USDCID = USDC;
		const appIndex = APP_ID;

		const bigIntVal = Number(userInput);
		const amount = Number(bigIntVal.toString() + '000000');
		console.log(amount);
		suggestedParams.flatFee = true;
		suggestedParams.fee = 3000;
		const txn1 = algosdk.makeApplicationNoOpTxnFromObject({
			from: address,
			appIndex,
			appArgs: [Uint8Array.from(Buffer.from('repay'))],
			foreignAssets: [NFTSelected.id],
			suggestedParams,
		});
		suggestedParams.fee = 0;
		const txn2 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
			from: address,
			to: algosdk.getApplicationAddress(appIndex),
			amount: amount,
			assetIndex: USDCID,
			suggestedParams,
		});

		const txnsToSign = [{ txn: txn1 }, { txn: txn2 }];
		algosdk.assignGroupID(txnsToSign.map((toSign) => toSign.txn));
		return [txnsToSign];
	};
	const JinaAppClearState: Scenario = async (
		chain: ChainType,
		address: string
	): Promise<ScenarioReturnType> => {
		const suggestedParams = await apiGetTxnParams(chain);

		const appIndex = 79061945;

		const txn = algosdk.makeApplicationClearStateTxnFromObject({
			from: address,
			appIndex,
			note: new Uint8Array(Buffer.from('Opt-Out APP')),
			appArgs: [],
			suggestedParams,
		});

		const txnsToSign = [
			{
				txn,
				message: 'This transaction will forcibly opt you out of the test app.',
			},
		];
		return [txnsToSign];
	};
	const Claimscenarios: Array<{ name: string; scenario1: Scenario }> = [
		{
			name: 'Claim USDC',
			scenario1: claimUSDCcall,
		},
	];
	const Repayscenarios: Array<{ name: string; scenario1: Scenario }> = [
		{
			name: 'Repay',
			scenario1: repayUSDCcall,
		},
	];
	const Borrowscenarios: Array<{ name: string; scenario1: Scenario }> = [
		{
			name: 'Borrow',
			scenario1: borrowAppCall,
		},
	];
	const ClearAppscenarios: Array<{ name: string; scenario1: Scenario }> = [
		{
			name: 'OPT-OUT APP',
			scenario1: JinaAppClearState,
		},
	];

	useEffect(() => {
		//readUserData(2);
		//readUserData(1);
		//readBorrowData('-Mz41LqbCdvaN8HDkwhz');
		//console.log(borrowLogicSig);
	}, [borrowLogicSig]);

	function selectLogicSigDispence(txn: algosdk.Transaction): Uint8Array {
		if (txn.assetIndex === 77141623) {
			return makeLogicSig;
		} else if (txn.assetIndex === 79077841) {
			return jusdLogicSig;
		}
		return makeLogicSig;
	}

	function signTxnLogicSigWithTestAccount(
		txn: algosdk.Transaction
	): Uint8Array {
		/* if (switcher === 0) {
			let lsa = selectLogicSigDispence(txn);
			if (txn.assetIndex === 77141623) {
				let lsig = algosdk.LogicSigAccount.fromByte(lsa);
				let signedTxn = algosdk.signLogicSigTransactionObject(txn, lsig);
				console.log(signedTxn.txID);
				return signedTxn.blob;
			} else if (txn.assetIndex === 79077841) {
				let lsig = algosdk.LogicSigAccount.fromByte(lsa);
				let signedTxn = algosdk.signLogicSigTransactionObject(txn, lsig);
				console.log(signedTxn.txID);
				return signedTxn.blob;
			}
		} */

		if (switcher === 1) {
			//let lsa = borrowLogicSig;
			//let lsa = makeLogicSig;
			console.log('Final' + borrowLogicSig);
			let lsig = algosdk.logicSigFromByte(borrowLogicSig);
			console.log(lsig.toByte());
			let signedTxn = algosdk.signLogicSigTransactionObject(txn, lsig);
			console.log(signedTxn.txID);
			return signedTxn.blob;
		}
		/*
		 */

		throw new Error(`Cannot sign transaction from account`);
	}
	const extractValues = JSON.parse(selectedNFT.value);
	const NFTSelected = assets.find(
		(asset: IAssetData) => asset && asset.id === extractValues.id
	) || {
		id: extractValues.id,
		amount: extractValues.amount,
		creator: extractValues.creator,
		frozen: extractValues.frozen,
		decimals: extractValues.decimals,
		name: extractValues.name,
		unitName: extractValues.unitName,
	};
	const LOFTYtoken = assets.find(
		(asset: IAssetData) => asset && asset.id === 77141623
	) || {
		id: 77141623,
		amount: BigInt(0),
		creator: '',
		frozen: false,
		decimals: 0,
		name: 'Lofty jina property',
		unitName: 'LFT-jina',
	};
	const nativeCurrency = assets.find(
		(asset: IAssetData) => asset && asset.id === 0
	) || {
		id: 0,
		amount: BigInt(0),
		creator: '',
		frozen: false,
		decimals: 6,
		name: 'Algo',
		unitName: 'Algo',
	};
	const USDCtoken = assets.find(
		(asset: IAssetData) => asset && asset.id === 10458941
	) || {
		id: 10458941,
		amount: BigInt(0),
		creator: '',
		frozen: false,
		decimals: 6,
		name: 'usdc',
		unitName: 'USDC',
	};
	const tokens = assets.filter(
		(asset: IAssetData) => asset && asset.id === 79077841
	);
	const JINAtoken = assets.find(
		(asset: IAssetData) => asset && asset.id === 79077841
	) || {
		id: 79077841,
		amount: BigInt(0),
		creator: '',
		frozen: false,
		decimals: 6,
		name: 'jUSD',
		unitName: 'jUSD',
	};

	const router = useRouter();
	const searchInputRef: any = useRef(null);
	const expiringdayRef: any = useRef(null);

	async function maximumAmount(
		tokenAsset: IAssetData,
		tokenType: number,
		bodyamounts: string
	) {
		focus();
		if (!bodyamounts) {
			setUserInput(
				Number(
					formatBigNumWithDecimals(
						BigInt(tokenAsset.amount),
						tokenAsset.decimals
					)
				)
			);
			return;
		}
		setUserInput(Number(bodyamounts));
		await LatestValue(address, chain, tokenType);
		return;
	}
	async function maximumAmountRepay(
		tokenAsset: IAssetData,
		tokenType: number,
		bodyamounts: string
	) {
		focus();
		if (!bodyamounts) {
			setBorrowing(
				Number(
					formatBigNumWithDecimals(
						BigInt(tokenAsset.amount),
						tokenAsset.decimals
					)
				)
			);
			return;
		}
		setBorrowing(Number(bodyamounts));
		return;
	}
	function Borrow(e: any) {
		e.preventDefault();
		console.log('Borrow function run!');
		// Check indexer
		if (!connector) return;
		//signTxnScenario(singleAppOptIn, connector, address, chain, 0);
	}
	function increaseBorrow(e: any) {
		e.preventDefault();
		console.log('increaseBorrow function run!');
	}
	function Repay(e: any) {
		e.preventDefault();
		console.log('Repay function run!');
	}
	async function stake() {
		console.log('Stake function run!');
		//let lsa = await MyalgoLsig(10000000);

		let lsa = await tealProgramDispence(77141623, 4);
		console.log(lsa);
		writeUserData(9, 'Staker', 'USDC', lsa);
		// After reading
		//const lsigs = algosdk.LogicSigAccount.fromByte(lsa);

		//let lsa1 = readUserData(5);
		//console.log(lsa1);
		//let alsig = algosdk.LogicSigAccount.fromByte(lsa1);

		//let aa = alsig.toByte();
		//writeUserData(7, 'jina', 'dora', aa);
		//setMakeLogicSig(newAmount2);
		//const logicSigAmount = Number(makeLogicSig);
		//const lsa = await tealProgramMake(logicSigAmount);
		//const suggestedParams = await apiGetTxnParams(ChainType.TestNet);
		// send to database

		// build txns
		//algosdk.signLogicSigTransactionObject(txn,lsig)
	}
	function searchAmount() {
		return borrowing;
	}
	function claimUSDC(e: any) {
		e.preventDefault();
		console.log('Claim function run!');
	}
	function focus() {
		if (searchInputRef.current !== null) searchInputRef.current.focus();
	}
	function borrowAmount(valmy: Number) {
		if (!valmy || valmy < 0) {
			return 0;
		}

		const val = Number(valmy) * 50;
		const fee = (3 / 100) * val;
		const overCollateralized = (10 / 100) * val;
		//console.log('Fee: ' + fee + ' overCollateral: ' + overCollateralized);
		const calculated = val - fee - overCollateralized;
		//setBorrowing(calculated);
		return calculated;
	}

	const [openTab, setOpenTab] = React.useState(1);
	const [openPage, setOpenPage] = useState(1);
	const [showModal, setShowModal] = useState(false);
	const [result, setResult] = useState<IResult | null>(null);
	const [pendingRequest, setPendingRequest] = useState(false);
	const [pendingSubmissions, setPendingSubmissions] = useState([]);

	useEffect(() => {
		console.log('render');

		return () => {
			console.log('return from change, CleanUP');
		};
	}, [userInput]);

	async function LatestValue(
		address: string,
		chain: ChainType,
		tokenType: Number
	) {
		try {
			const Myassets = await apiGetAccountAssets(chain, address);
			if (tokenType === 0) {
				const NFTSelected1 = Myassets.find(
					(asset: IAssetData) => asset && asset.id === extractValues.id
				) || {
					id: extractValues.id,
					amount: extractValues.amount,
					creator: extractValues.creator,
					frozen: extractValues.frozen,
					decimals: extractValues.decimals,
					name: extractValues.name,
					unitName: extractValues.unitName,
				};
				if (!NFTSelected1) {
					return;
				}
				console.log('Found LFT!');
				const Myval = formatBigNumWithDecimals(
					BigInt(NFTSelected1.amount),
					NFTSelected1.decimals
				);
				console.log('New Value: ' + Myval);
				setNewAmount(Myval);
				return;
			}
			if (tokenType === 1) {
				const USDCtoken1 = Myassets.find(
					(asset: IAssetData) => asset && asset.id === 10458941
				) || {
					id: 10458941,
					amount: BigInt(0),
					creator: '',
					frozen: false,
					decimals: 6,
					name: 'usdc',
					unitName: 'USDC',
				};
				if (!USDCtoken1) {
					return;
				}
				console.log('Found USDC!');
				const Myval = formatBigNumWithDecimals(
					BigInt(USDCtoken1.amount),
					USDCtoken1.decimals
				);
				console.log('New Value: ' + Myval);
				setNewAmount2(Myval);
				return;
			}
			if (tokenType === 2) {
				const JINAtoken1 = Myassets.find(
					(asset: IAssetData) => asset && asset.id === 79077841
				) || {
					id: 79077841,
					amount: BigInt(0),
					creator: '',
					frozen: false,
					decimals: 6,
					name: 'jUSD',
					unitName: 'jUSD',
				};
				if (!JINAtoken1) {
					return;
				}
				console.log('Found JUSD!');
				const Myval = formatBigNumWithDecimals(
					BigInt(JINAtoken1.amount),
					JINAtoken1.decimals
				);
				console.log('New Value: ' + Myval);
				setNewAmount3(Myval);
				return;
			}
		} catch (error) {
			console.log('Error');
		}
	}

	const toggleModal = () => {
		setShowModal(!showModal);
		setPendingSubmissions([]);
	};

	async function signTxnScenario(
		scenario1: Scenario,
		connector: WalletConnect,
		address: string,
		chain: ChainType,
		tokenType: Number
	) {
		if (!connector) {
			console.log('No connector found!');
			return;
		}

		try {
			const txnsToSign = await scenario1(chain, address);
			console.log(txnsToSign);
			// open modal
			toggleModal();
			//setToggleModal(showModal)

			// toggle pending request indicator
			//this.setState({ pendingRequest: true });
			setPendingRequest(true);

			const flatTxns = txnsToSign.reduce((acc, val) => acc.concat(val), []);

			const walletTxns: IWalletTransaction[] = flatTxns.map(
				({ txn, signers, authAddr, message }) => ({
					txn: Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString(
						'base64'
					),
					signers, // TODO: put auth addr in signers array
					authAddr,
					message,
				})
			);

			// sign transaction
			const requestParams: SignTxnParams = [walletTxns];
			const request = formatJsonRpcRequest('algo_signTxn', requestParams);
			//console.log('Request param:', request);
			const result: Array<string | null> = await connector.sendCustomRequest(
				request
			);

			console.log('Raw response:', result);

			const indexToGroup = (index: number) => {
				for (let group = 0; group < txnsToSign.length; group++) {
					const groupLength = txnsToSign[group].length;
					if (index < groupLength) {
						return [group, index];
					}

					index -= groupLength;
				}

				throw new Error(`Index too large for groups: ${index}`);
			};

			const signedPartialTxns: Array<Array<Uint8Array | null>> = txnsToSign.map(
				() => []
			);
			result.forEach((r, i) => {
				const [group, groupIndex] = indexToGroup(i);
				const toSign = txnsToSign[group][groupIndex];

				if (r == null) {
					if (toSign.signers !== undefined && toSign.signers?.length < 1) {
						signedPartialTxns[group].push(null);
						return;
					}
					throw new Error(
						`Transaction at index ${i}: was not signed when it should have been`
					);
				}

				if (toSign.signers !== undefined && toSign.signers?.length < 1) {
					throw new Error(
						`Transaction at index ${i} was signed when it should not have been`
					);
				}

				const rawSignedTxn = Buffer.from(r, 'base64');
				signedPartialTxns[group].push(new Uint8Array(rawSignedTxn));
			});

			const signedTxns: Uint8Array[][] = signedPartialTxns.map(
				(signedPartialTxnsInternal, group) => {
					return signedPartialTxnsInternal.map((stxn, groupIndex) => {
						if (stxn) {
							console.log('Signed ONLY with WALLETCONNECT!');
							return stxn;
						}
					});
				}
			) as Uint8Array[][];

			const signedTxnInfo: Array<
				Array<{
					txID: string;
					signingAddress?: string;
					signature: string;
				} | null>
			> = signedPartialTxns.map((signedPartialTxnsInternal, group) => {
				return signedPartialTxnsInternal.map((rawSignedTxn, i) => {
					if (rawSignedTxn == null) {
						return null;
					}

					const signedTxn = algosdk.decodeSignedTransaction(rawSignedTxn);
					const txn = signedTxn.txn as unknown as algosdk.Transaction;
					const txID = txn.txID();
					const unsignedTxID = txnsToSign[group][i].txn.txID();

					if (txID !== unsignedTxID) {
						throw new Error(
							`Signed transaction at index ${i} differs from unsigned transaction. Got ${txID}, expected ${unsignedTxID}`
						);
					}

					if (!signedTxn.sig) {
						throw new Error(
							`Signature not present on transaction at index ${i}`
						);
					}

					return {
						txID,
						signingAddress: signedTxn.sgnr
							? algosdk.encodeAddress(signedTxn.sgnr)
							: undefined,
						signature: Buffer.from(signedTxn.sig).toString('base64'),
					};
				});
			});

			console.log('Signed txn info:', signedTxnInfo);
			// format displayed result
			const formattedResult: IResult = {
				method: 'algo_signTxn',
				body: signedTxnInfo,
			};
			setPendingRequest(false);
			setResult(formattedResult);

			setPendingSubmissions(signedTxns.map(() => 0) as []);
			signedTxns.forEach(async (signedTxn, index) => {
				try {
					const confirmedRound = await apiSubmitTransactions(chain, signedTxn);

					setPendingSubmissions(
						(prevPendingSubmissions) =>
							prevPendingSubmissions.map((v, i) => {
								if (index === i) {
									return confirmedRound;
								}
								return v;
							}) as []
					);
					console.log(`Transaction confirmed at round ${confirmedRound}`);
					await LatestValue(address, chain, tokenType);
				} catch (err) {
					setPendingSubmissions(
						(prevPendingSubmissions) =>
							prevPendingSubmissions.map((v, i) => {
								if (index === i) {
									return err;
								}
								return v;
							}) as []
					);
					console.error(`Error submitting transaction: `, err);
				}
			});
		} catch (error) {
			console.error(error);
			setPendingRequest(false);
			setResult(null);
		}
	}
	async function signTxnLogic(
		scenario1: Scenario,
		connector: WalletConnect,
		address: string,
		chain: ChainType,
		tokenType: Number
	) {
		if (!connector) {
			console.log('No connector found!');
			return;
		}

		try {
			const txnsToSign = await scenario1(chain, address);
			console.log(txnsToSign);
			// open modal
			toggleModal();
			//setToggleModal(showModal)

			// toggle pending request indicator
			//this.setState({ pendingRequest: true });
			setPendingRequest(true);

			const flatTxns = txnsToSign.reduce((acc, val) => acc.concat(val), []);

			const walletTxns: IWalletTransaction[] = flatTxns.map(
				({ txn, signers, authAddr, message }) => ({
					txn: Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString(
						'base64'
					),
					signers, // TODO: put auth addr in signers array
					authAddr,
					message,
				})
			);

			// sign transaction
			const requestParams: SignTxnParams = [walletTxns];
			const request = formatJsonRpcRequest('algo_signTxn', requestParams);
			//console.log('Request param:', request);
			const result: Array<string | null> = await connector.sendCustomRequest(
				request
			);

			console.log('Raw response:', result);

			const indexToGroup = (index: number) => {
				for (let group = 0; group < txnsToSign.length; group++) {
					const groupLength = txnsToSign[group].length;
					if (index < groupLength) {
						return [group, index];
					}

					index -= groupLength;
				}

				throw new Error(`Index too large for groups: ${index}`);
			};

			const signedPartialTxns: Array<Array<Uint8Array | null>> = txnsToSign.map(
				() => []
			);
			result.forEach((r, i) => {
				const [group, groupIndex] = indexToGroup(i);
				const toSign = txnsToSign[group][groupIndex];

				if (r == null) {
					if (toSign.signers !== undefined && toSign.signers?.length < 1) {
						signedPartialTxns[group].push(null);
						return;
					}
					throw new Error(
						`Transaction at index ${i}: was not signed when it should have been`
					);
				}

				if (toSign.signers !== undefined && toSign.signers?.length < 1) {
					throw new Error(
						`Transaction at index ${i} was signed when it should not have been`
					);
				}

				const rawSignedTxn = Buffer.from(r, 'base64');
				signedPartialTxns[group].push(new Uint8Array(rawSignedTxn));
			});

			const signedTxns: Uint8Array[][] = signedPartialTxns.map(
				(signedPartialTxnsInternal, group) => {
					return signedPartialTxnsInternal.map((stxn, groupIndex) => {
						if (stxn) {
							return stxn;
						}

						return signTxnLogicSigWithTestAccount(
							txnsToSign[group][groupIndex].txn
						);
					});
				}
			);

			const signedTxnInfo: Array<
				Array<{
					txID: string;
					signingAddress?: string;
					signature: string;
				} | null>
			> = signedPartialTxns.map((signedPartialTxnsInternal, group) => {
				return signedPartialTxnsInternal.map((rawSignedTxn, i) => {
					if (rawSignedTxn == null) {
						return null;
					}

					const signedTxn = algosdk.decodeSignedTransaction(rawSignedTxn);
					const txn = signedTxn.txn as unknown as algosdk.Transaction;
					const txID = txn.txID();
					const unsignedTxID = txnsToSign[group][i].txn.txID();

					if (txID !== unsignedTxID) {
						throw new Error(
							`Signed transaction at index ${i} differs from unsigned transaction. Got ${txID}, expected ${unsignedTxID}`
						);
					}

					if (!signedTxn.sig) {
						throw new Error(
							`Signature not present on transaction at index ${i}`
						);
					}

					return {
						txID,
						signingAddress: signedTxn.sgnr
							? algosdk.encodeAddress(signedTxn.sgnr)
							: undefined,
						signature: Buffer.from(signedTxn.sig).toString('base64'),
					};
				});
			});

			console.log('Signed txn info:', signedTxnInfo);
			// format displayed result
			const formattedResult: IResult = {
				method: 'algo_signTxn',
				body: signedTxnInfo,
			};
			setPendingRequest(false);
			setResult(formattedResult);

			setPendingSubmissions(signedTxns.map(() => 0) as []);
			signedTxns.forEach(async (signedTxn, index) => {
				try {
					const confirmedRound = await apiSubmitTransactions(chain, signedTxn);

					setPendingSubmissions(
						(prevPendingSubmissions) =>
							prevPendingSubmissions.map((v, i) => {
								if (index === i) {
									return confirmedRound;
								}
								return v;
							}) as []
					);
					console.log(`Transaction confirmed at round ${confirmedRound}`);
					await LatestValue(address, chain, tokenType);
					await LatestValue(address, chain, 1);
				} catch (err) {
					setPendingSubmissions(
						(prevPendingSubmissions) =>
							prevPendingSubmissions.map((v, i) => {
								if (index === i) {
									return err;
								}
								return v;
							}) as []
					);
					console.error(`Error submitting transaction: `, err);
				}
			});
		} catch (error) {
			console.error(error);
			setPendingRequest(false);
			setResult(null);
		}
	}
	function filterByID(item: any) {
		if (item.txn && item.signers === undefined) {
			return true;
		} //else if(item.signers === []) {return false}

		return false;
	}
	async function myAlgoSign(
		scenario1: Scenario,
		mconnector: MyAlgoConnect,
		address: string,
		chain: ChainType,
		tokenType: Number
	) {
		if (!mconnector) {
			console.log('No connector found!');
			return;
		}
		try {
			const txnsToSign = await scenario1(chain, address);
			console.log(txnsToSign);
			console.log('MyAlgo Signing');
			// open modal
			toggleModal();
			setPendingRequest(true);

			const flatTxns = txnsToSign.reduce((acc, val) => acc.concat(val), []);
			console.log('Flatened txn');
			const signedPartialTxns: Array<Array<Uint8Array | null>> = txnsToSign.map(
				() => []
			);

			// sign transaction
			const myAlgoConnect = new MyAlgoConnect();

			const filtered = flatTxns.filter(filterByID);
			console.log(filtered);
			const txnsArray = filtered.map((a) => a.txn);
			console.log(txnsArray);
			let txIdd;
			txnsArray.map((txn) => (txIdd = txn.txID().toString()));
			const signedTxn = await myAlgoConnect.signTransaction(
				txnsArray.map((txn) => txn.toByte())
			);
			console.log('Raw signed response:', signedTxn);

			const signedTxns: Uint8Array[][] = signedPartialTxns.map(
				(signedPartialTxnsInternal, group) => {
					return signedPartialTxnsInternal.map((stxn, groupIndex) => {
						if (stxn) {
							return stxn;
						}

						return signTxnLogicSigWithTestAccount(
							txnsToSign[group][groupIndex].txn
						);
					});
				}
			);
			// Start Submitting
			setPendingRequest(false);
			//setResult(formattedResult);

			setPendingSubmissions(signedTxn.map(() => 0) as []);
			// Submit the transaction
			await testNetClientalgod.sendRawTransaction(signedTxn[0].blob).do();
			try {
				if (txIdd) {
					// Wait for confirmation
					let confirmedTxn = await algosdk.waitForConfirmation(
						testNetClientalgod,
						txIdd,
						4
					);

					setPendingSubmissions(confirmedTxn['confirmed-round']);
					console.log(`Transaction confirmed at round ${confirmedTxn}`);
					await LatestValue(address, chain, tokenType);
					await LatestValue(address, chain, 1);
				}
			} catch (err) {
				console.error(`Error submitting transaction: `, err);
			}
		} catch (err) {}
	}
	const [holdSelect, setHoldSelect] = useState(0);
	const [assetsSelected, setAssetsSelected] = useState(['77141623']);
	const initialState = 0;
	const reducer = (state: any, action: any) => {
		switch (action) {
			case 'increment':
				return state + 1;
			case 'decrement':
				return state - 1;
			default:
				return state;
		}
	};
	const [count, dispatch] = useReducer(reducer, initialState);
	const options = [
		{ value: 'LFT-jina', label: 'LFT-jina' },
		{ value: 'strawberry', label: 'Strawberry' },
		{ value: 'Jusd', label: 'jusd' },
	];
	const customStyles = {
		option: (provided: any, state: any) => ({
			...provided,
			borderBottom: '1px dotted pink',
			color: state.isSelected ? 'red' : 'blue',
			padding: 0,
		}),
		control: () => ({
			// none of react-select's styles are passed to <Control />
			width: 100,
			height: 10,
		}),
		singleValue: (provided: any, state: any) => {
			const opacity = state.isDisabled ? 0.5 : 1;
			const transition = 'opacity 300ms';

			return { ...provided, opacity, transition };
		},
	};
	const getNFTs = async () => {
		const response = await fetch('/api/accountAssets', {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				address,
			}),
		});
		const data = await response.json();
		return data;
	};
	const loadOptions = (
		inputValue: string,
		callback: (options: iOption[]) => void
	) => {
		setTimeout(async () => {
			// Fetch data
			const data = await getNFTs();
			if (data !== undefined) {
				console.log(data);

				// Extract data and populate AsyncSelect
				const tempArray: iOption[] = [];
				/* if (data[0]['id'] === 0) {
					callback([]);
				} */
				data.forEach((element: any) => {
					tempArray.push({
						label: `${element['unitName']}`,
						value: `${JSON.stringify(element, replacer)}`,
					});
				});
				callback(
					tempArray.filter((i) =>
						i.label.toLowerCase().includes(inputValue.toLowerCase())
					)
				);
			}
		});
	};
	const handleInputChange = (newValue: string) => {
		const inputValue = newValue.replace(/\W/g, '');
		//setInputValue(inputValue);
		return inputValue;
	};
	return (
		<div>
			<ToastContainer
				hideProgressBar={false}
				newestOnTop
				closeOnClick
				rtl={false}
				pauseOnFocusLoss
				draggable
				pauseOnHover
			/>
			{openPage === 1 ? (
				<div className='flex whitespace-nowrap space-x-10 sm:space-x-20 '>
					<div className='group'>
						<button
							className={`flex flex-auto items-center min-w-min max-w-max pl-14 pr-0 pb-0.5 cursor-pointer transition duration-100 group-hover:text-indigo-500 
					`}
							onClick={(e) => {
								e.preventDefault();
								setOpenPage(0);
							}}
						>
							<span className='border-b-2'>{'Fiat'}</span>
							<ChevronDoubleRightIcon className='h-5 sm:ml-2 text-gray-500 cursor-pointer transition duration-100 transform group-hover:scale-110 group-hover:text-indigo-500' />
						</button>
					</div>
					<div className='group'>
						<a
							className={`flex flex-auto items-center max-w-min border-transparent pb-0.5 cursor-pointer transition duration-100 group-hover:text-indigo-500 group-hover:border-indigo-500
					`}
							onClick={(e) => {
								e.preventDefault();
								setOpenPage(2);
							}}
						>
							<span className='border-b-2 '>{'Facuets'}</span>
							<ChevronRightIcon className='h-5 sm:mr-2 text-gray-500 cursor-pointer transition duration-100 transform group-hover:scale-125 group-hover:text-indigo-500' />
						</a>
					</div>
				</div>
			) : openPage === 0 ? (
				<>
					<div className='group'>
						<a
							className={`flex flex-auto items-center max-w-min pl-14 border-transparent pb-0.5 cursor-pointer transition duration-100 group-hover:text-indigo-500 group-hover:border-indigo-500
					`}
							onClick={(e) => {
								e.preventDefault();
								setOpenPage(1);
							}}
						>
							<ChevronLeftIcon className='h-5 sm:mr-2 text-gray-500 cursor-pointer transition duration-100 transform group-hover:scale-125 group-hover:text-indigo-500' />
							<span className='border-b-2 '>{'Back'}</span>
						</a>
					</div>
					<Fiat address={address} />
				</>
			) : (
				<>
					<div className='group'>
						<a
							className={`flex flex-auto items-center max-w-min pl-14 border-transparent pb-0.5 cursor-pointer transition duration-100 group-hover:text-indigo-500 group-hover:border-indigo-500
					`}
							onClick={(e) => {
								e.preventDefault();
								setOpenPage(1);
							}}
						>
							<ChevronLeftIcon className='h-5 sm:mr-2 text-gray-500 cursor-pointer transition duration-100 transform group-hover:scale-125 group-hover:text-indigo-500' />
							<span className='border-b-2 '>{'Back'}</span>
						</a>
					</div>
					<Faucets
						assets={assets}
						address={address}
						connector={connector}
						chain={chain}
						wc={wc}
						mconnector={mconnector}
					/>
				</>
			)}

			{/* Body component */}
			{openPage === 1 && (
				<div className='flex flex-col items-center mt-16 flex-grow'>
					{/* Nav */}
					<nav className='relative border-b'>
						<div className='flex px-14 sm:px-20 text-2xl whitespace-nowrap space-x-10 sm:space-x-20  '>
							<a
								className={`pl-14 border-b-2 border-transparent pb-0.5 cursor-pointer transition duration-100 transform hover:scale-105 hover:text-indigo-500 hover:border-indigo-500 ${
									openTab === 1 && 'text-indigo-500 border-indigo-500'
								}`}
								onClick={(e) => {
									e.preventDefault();
									setOpenTab(1);

									setUserInput(0);
								}}
							>
								Borrow
							</a>
							<a
								className={`last:pr-24 border-b-2 border-transparent pb-0.5 cursor-pointer transition duration-100 transform hover:scale-105 hover:text-indigo-500 hover:border-indigo-500 ${
									openTab === 2 && 'text-indigo-500 border-indigo-500'
								}`}
								onClick={(e) => {
									e.preventDefault();
									setOpenTab(2);
									setUserInput(0);
								}}
							>
								Repay
							</a>
							<a
								className={`last:pr-24 border-b-2 border-transparent pb-0.5 cursor-pointer transition duration-100 transform hover:scale-105 hover:text-indigo-500 hover:border-indigo-500 ${
									openTab === 3 && 'text-indigo-500 border-indigo-500'
								}`}
								onClick={(e) => {
									e.preventDefault();
									setOpenTab(3);
									setUserInput(0);
								}}
							>
								Earn
							</a>
							<a
								className={` border-b-2 border-transparent pb-0.5 cursor-pointer transition duration-100 transform hover:scale-105 hover:text-indigo-500 hover:border-indigo-500 ${
									openTab === 4 && 'text-indigo-500 border-indigo-500'
								}`}
								onClick={(e) => {
									e.preventDefault();
									setOpenTab(4);
									setUserInput(0);
								}}
							>
								Claim
							</a>
						</div>
					</nav>
					{openTab === 1 && (
						<>
							<BalanceAsset
								key={NFTSelected.id}
								asset={NFTSelected}
								bodyamount={newAmount}
							/>
						</>
					)}
					{openTab === 2 && (
						<BalanceAsset
							key={USDCtoken.id}
							asset={USDCtoken}
							bodyamount={newAmount2}
						/>
					)}
					{openTab === 3 && (
						<>
							<BalanceAsset
								key={USDCtoken.id}
								asset={USDCtoken}
								bodyamount={newAmount2}
							/>
							<assetsContext.Provider
								value={{
									countState: count,
									countDispatch: dispatch,
									assetSelect: setAssetsSelected,
									assetVals: assetsSelected,
								}}
							>
								<SelectAssets assetid={77141623} />
							</assetsContext.Provider>
						</>
					)}
					{openTab === 4 &&
						tokens.map((token) => (
							<BalanceAsset
								key={token.id}
								asset={token}
								bodyamount={newAmount3}
							/>
						))}
					{/* <Tabs color='blue' /> */}
					<form className='flex w-full mt-5 hover:shadow-lg focus-within:shadow-lg max-w-md rounded-full border border-gray-200 px-5 py-3 items-center sm:max-w-xl lg:max-w-2xl'>
						<div className='relative px-7 py-2 rounded-md leading-none flex items-center divide-x divide-gray-500'>
							{openTab === 1 && (
								<>
									<span
										className='pr-2 text-indigo-400 cursor-pointer hover:text-pink-600 transition duration-200'
										onClick={(e) => {
											e.preventDefault();
											maximumAmount(NFTSelected, 0, newAmount);
										}}
									>
										MAX
									</span>
									<span className='pl-2 text-gray-500'>
										<AsyncSelect
											cacheOptions
											loadOptions={loadOptions}
											placeholder='Select NFT/Assets'
											defaultOptions
											onInputChange={handleInputChange}
											onChange={async (option) => {
												setSelectedNFT(option as iOption);
											}}
										/>
									</span>
								</>
							)}
							{openTab === 2 && (
								<>
									<span
										className='pr-2 text-indigo-400 cursor-pointer hover:text-pink-600 transition duration-200'
										onClick={(e) => {
											e.preventDefault();
											maximumAmount(USDCtoken, 1, newAmount2);
										}}
									>
										MAX
									</span>
									<span className='pl-2 text-gray-500'>USDC</span>
								</>
							)}
							{openTab === 3 && (
								<>
									<span
										className='pr-2 text-indigo-400 cursor-pointer hover:text-pink-600 transition duration-200'
										onClick={(e) => {
											e.preventDefault();
											maximumAmount(USDCtoken, 1, newAmount2);
										}}
									>
										MAX
									</span>
									<span className='pl-2 text-gray-500'>USDC</span>
								</>
							)}
							{openTab === 4 && (
								<>
									<span
										className='pr-2 text-indigo-400 cursor-pointer hover:text-pink-600 transition duration-200'
										onClick={(e) => {
											e.preventDefault();
											maximumAmount(JINAtoken, 2, newAmount3);
										}}
									>
										MAX
									</span>
									<span className='pl-2 text-gray-500'>JUSD</span>
								</>
							)}
						</div>
						<input
							ref={searchInputRef}
							type='number'
							className='flex-grow focus:outline-none bg-[#FAFAFA]'
							value={userInput}
							onChange={(e) => setUserInput(Number(e.target.value))}
						/>
						<XIcon
							className='h-5 sm:mr-3 text-gray-500 cursor-pointer transition duration-100 transform hover:scale-125'
							onClick={() => setUserInput(0)}
						/>
						{openTab === 1 && (
							<>
								{wc ? (
									<button hidden type='submit' onClick={Borrow}>
										Borrow
									</button>
								) : (
									<button hidden type='submit' onClick={Borrow}>
										Borrow
									</button>
								)}
							</>
						)}
						{openTab === 2 && (
							<button hidden type='submit' onClick={Repay}>
								{' '}
								repay{' '}
							</button>
						)}
						{openTab === 3 && (
							<>
								<button hidden type='submit' onClick={stake}>
									{' '}
									stake{' '}
								</button>
							</>
						)}
						{openTab === 4 && (
							<button hidden type='submit' onClick={claimUSDC}>
								{' '}
								claim{' '}
							</button>
						)}
					</form>
					{openTab === 1 && (
						<>
							<form className='flex w-full mt-5 hover:shadow-lg focus-within:shadow-lg max-w-md rounded-full border border-gray-200 px-5 py-3 items-center sm:max-w-xl lg:max-w-2xl'>
								<p className='relative px-7 py-2 rounded-md leading-none flex items-center divide-x divide-gray-500'>
									<span
										className='pr-2 text-indigo-400 cursor-pointer hover:text-pink-600 transition duration-200'
										onClick={(e) => {
											e.preventDefault();
											maximumAmount(NFTSelected, 0, newAmount);
										}}
									>
										MAX
									</span>
									<span className='pl-2 text-gray-500'>USDC</span>
								</p>
								<input
									type='number'
									placeholder='loan amount'
									className='flex-grow focus:outline-none bg-[#FAFAFA]'
									value={borrowing}
									onChange={(e) => {
										setSwitcher(1);
										setBorrowing(Number(e.target.value));
									}}
								/>
							</form>

							<div className='flex flex-col w-1/2 space-y-2 justify-center mt-7 sm:space-y-0 sm:flex-row sm:space-x-4'>
								{Borrowscenarios.map(({ name, scenario1 }) => (
									<button
										className='btn'
										key={name}
										onClick={(e) => {
											e.preventDefault();
											setSwitcher(1);
											if (wc) {
												signTxnLogic(
													scenario1,
													connector as WalletConnect,
													address,
													chain,
													0
												);
											} else {
												myAlgoSign(
													scenario1,
													mconnector as MyAlgoConnect,
													address,
													chain,
													0
												);
											}
										}}
									>
										{name}
									</button>
								))}
								{/* <button
								onClick={(e) => {
									e.preventDefault();
									LatestValue(address, chain, 0);
								}}
								className='btn'
							>
								Increase Collateral
							</button> */}
								<button
									onClick={(e) => {
										e.preventDefault();
										LatestValue(address, chain, 0);
										borrowIndexer(NFTSelected.id, searchAmount());
									}}
									className='btn'
								>
									Search Lenders
								</button>
							</div>
						</>
					)}
					{/* className='relative px-6 py-1 sm:px-7 sm:py-2 rounded-md leading-none flex items-center bg-[#18393a] text-gray-100' */}
					{openTab === 2 && (
						<>
							<div className='flex w-full mt-5 hover:shadow-lg focus-within:shadow-lg max-w-md rounded-full border border-gray-200 px-5 py-3 items-center sm:max-w-xl lg:max-w-2xl'>
								<span className='pl-2 text-gray-500'>
									<AsyncSelect
										cacheOptions
										loadOptions={loadOptions}
										placeholder='Select NFT/Assets'
										defaultOptions
										onInputChange={handleInputChange}
										onChange={async (option) => {
											setSelectedNFT(option as iOption);
										}}
										className='flex-grow focus:outline-none bg-[#FAFAFA]'
									/>
								</span>
							</div>

							<div className='flex flex-col w-1/2 space-y-2 justify-center mt-8 sm:space-y-0 sm:flex-row sm:space-x-4'>
								{Repayscenarios.map(({ name, scenario1 }) => (
									<button
										className='btn'
										key={name}
										onClick={(e) => {
											e.preventDefault();
											signTxnLogic(
												scenario1,
												connector as WalletConnect,
												address,
												chain,
												1
											);
										}}
									>
										{name}
									</button>
								))}
							</div>
						</>
					)}
					{openTab === 3 && (
						<>
							<form className='flex w-full mt-5 hover:shadow-lg focus-within:shadow-lg max-w-md rounded-full border border-gray-200 px-5 py-3 items-center sm:max-w-xl lg:max-w-2xl'>
								<p className='relative px-7 py-2 rounded-md leading-none flex items-center divide-x divide-gray-500'>
									<span
										onClick={(e) => {
											e.preventDefault();
											expiringdayRef.current.value = 10;
										}}
										className='pr-2 text-indigo-400 cursor-pointer hover:text-pink-600 transition duration-200'
									>
										Expire Day
									</span>
								</p>
								<input
									type='number'
									placeholder='10 days'
									className='flex-grow focus:outline-none bg-[#FAFAFA]'
									ref={expiringdayRef}
									onChange={(e) => {
										setExpireday(Number(e.target.value));
									}}
								/>
							</form>
							<div
								onClick={(e) => {
									e.preventDefault();
									LatestValue(address, chain, 1);
								}}
								className='flex flex-col w-1/2 space-y-2 justify-center mt-8 sm:space-y-0 sm:flex-row sm:space-x-4'
							>
								<assetsContext.Provider
									value={{
										countState: count,
										countDispatch: dispatch,
										assetSelect: setAssetsSelected,
										assetVals: assetsSelected,
										addressVal: address,
										//maccounts: maccounts,
									}}
								>
									{/* <AlgoSignerLsig /> */}
									{wc ? (
										<>
											<p>Connect with MyAlgo wallet to access LogicSig</p>
										</>
									) : (
										<DynamicComponentWithNoSSR
											amount={userInput}
											round={expireday}
										/>
									)}
								</assetsContext.Provider>
							</div>
						</>
					)}
					{openTab === 4 && (
						<div className='flex flex-col w-1/2 space-y-2 justify-center mt-8 sm:space-y-0 sm:flex-row sm:space-x-4'>
							{Claimscenarios.map(({ name, scenario1 }) => (
								<button
									className='btn'
									key={name}
									onClick={(e) => {
										e.preventDefault();
										signTxnLogic(
											scenario1,
											connector as WalletConnect,
											address,
											chain,
											2
										);
									}}
								>
									{name}
								</button>
							))}
						</div>
					)}
				</div>
			)}
			{/* Footer */}
			<Modal show={showModal} toggleModal={toggleModal}>
				{pendingRequest ? (
					<div className='w-full relative break-words'>
						<div className='mt-1 mb-0 font-bold text-xl'>
							{'Pending Call Request'}
						</div>
						<div className='h-full min-h-2 flex flex-col justify-center items-center break-words'>
							<Loader />
							<p className='mt-8'>
								{'Approve or reject request using your wallet'}
							</p>
						</div>
					</div>
				) : result ? (
					<div className='w-full relative break-words'>
						<div className='mt-1 mb-0 font-bold text-xl'>
							{'Call Request Approved'}
						</div>
						{React.Children.toArray(
							pendingSubmissions.map((submissionInfo, index) => {
								const key = `${index}:${
									typeof submissionInfo === 'number' ? submissionInfo : 'err'
								}`;
								const prefix = `Txn Group ${index}: `;
								let content: string;

								if (submissionInfo === 0) {
									content = 'Submitting...';
								} else if (typeof submissionInfo === 'number') {
									content = `Confirmed at round ${submissionInfo}`;
								} else {
									content =
										'Rejected by network. See console for more information.';
								}

								return (
									<>
										<div className='flex flex-col text-left'>
											{React.Children.toArray(
												result.body.map((signedTxns, index) => (
													<div className='w-full flex mt-1 mb-0' key={index}>
														<div className='w-1/6 font-bold'>{`TxID: `}</div>
														<div className='w-10/12 font-mono'>
															{React.Children.toArray(
																signedTxns.map((txn, txnIndex) => (
																	<div key={txnIndex}>
																		{!!txn?.txID && <p>{txn.txID}</p>}
																	</div>
																))
															)}
														</div>
													</div>
												))
											)}
										</div>
										<div className='mt-1 mb-0 font-bold text-xl' key={key}>
											{content}
										</div>
									</>
								);
							})
						)}
					</div>
				) : (
					<div className='w-full relative break-words'>
						<div className='mt-1 mb-0 font-bold text-xl'>
							{'Call Request Rejected'}
						</div>
					</div>
				)}
			</Modal>
		</div>
	);
}
// {/* Footer */}<Body assets={assets} signtxn={this.signTxnScenario}/>
