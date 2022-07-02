import MyAlgoConnect from '@randlabs/myalgo-connect';
import algosdk, { Transaction } from 'algosdk';
import { useState, useEffect, useContext } from 'react';
import {
	apiGetTxnParams,
	apiSubmitTransactions,
	ChainType,
	testNetClientalgod,
	testNetClientindexer,
} from '../lib/helpers/api';
//import {name,networks,methods} from '../public/d4t.json';
import { create } from 'ipfs-http-client';
import { assetsContext } from '../lib/helpers/assetsContext';
import { APP_ID, DUSD, NFTColl, USDC } from '../lib/helpers/constants';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const ipfs = create({
	host: 'ipfs.infura.io',
	port: 5001,
	protocol: 'https',
});
export default function MyalgoConnect(props: {
	amount: number;
	round: number;
}) {
	const { amount, round } = props;
	const AssetsContext = useContext(assetsContext);

	let rounds = round;
	if (round == undefined) rounds = 10;

	const newAmount = amount * 1000000;
	const [result, setResult] = useState(AssetsContext.addressVal);
	const [validRound, setValidRound] = useState(2);
	const [hashIpfs, setHashIpfs] = useState('');
	const myAlgoConnect = new MyAlgoConnect({ disableLedgerNano: false });

	const [fileUrl, updateFileUrl] = useState(``);
	console.log(AssetsContext.countState);
	useEffect(() => {
		console.log('render for ipfsPath');

		/* return () => {
			console.log('return from change, CleanUP');
		}; */
	}, [hashIpfs]);

	const logic = async () => {
		console.log('Stake function run!');
		//const lsig = await tealProgramMake(amount);
		let params = await testNetClientalgod.getTransactionParams().do();
		let data =
			'#pragma version 4 \nglobal ZeroAddress \ndup \ndup \ntxn RekeyTo \n== \nassert \ntxn CloseRemainderTo \n== \nassert \ntxn AssetCloseTo \n== \nassert \ntxn Fee \nint 0 \n== \ntxn XferAsset \narg_0 \nbtoi \n== \ntxn AssetAmount \narg_1 \nbtoi \n<= \ntxn LastValid \narg_2 \nbtoi \n<= \ngtxn 0 TypeEnum \nint appl \n== \ngtxn 0 ApplicationID \narg_3 \nbtoi \n== \n&& \n&& \n&& \n&& \n&& \nreturn';
		let results = await testNetClientalgod.compile(data).do();
		console.log('Hash = ' + results.hash);
		console.log('Result = ' + results.result);
		let program = new Uint8Array(Buffer.from(results.result, 'base64'));

		if (rounds == 0) rounds = 10;
		let dayToRound = rounds * 17280;
		let exround = params.firstRound + dayToRound;
		setValidRound(exround);
		console.log(newAmount);
		let args = getUint8Args(Number(newAmount), exround);
		//let lsig = new algosdk.LogicSigAccount(program, args);

		const lsig = algosdk.makeLogicSig(program, args);

		lsig.sig = await myAlgoConnect.signLogicSig(lsig.logic, result);
		//const lsigs = await myAlgoConnect.signLogicSig(lsig, result);
		const lsa = lsig.toByte();
		console.log(lsa);

		try {
			toast.info(`Uploading to IPFS...`, {
				position: 'top-right',
				autoClose: false,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
				toastId: 'info-ipfs',
			});
			const added = await ipfs.add(lsa);
			const url = `https://ipfs.infura.io/ipfs/${added.path}`;
			updateFileUrl(url);
			//console.log(url);
			const ipfsPath = added.path;
			console.log(added.path);
			console.log(added.cid.toString());

			//console.log(JSON.stringify(chunks));
			setHashIpfs(ipfsPath);

			toast.info(`IPFS hash: ${ipfsPath}`, {
				position: 'top-right',
				autoClose: false,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
				toastId: 'info-hash',
			});
			toast.success(`Uploaded to IPFS🎉`, {
				position: 'top-right',
				autoClose: 8000,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
				toastId: 'success-ipfs',
			});
			//console.log(hashVal);
			/* const chunks = [];
			for await (const chunk of ipfs.cat(ipfsPath)) {
				chunks.push(chunk);
			}
			console.log(chunks); */
		} catch (error) {
			toast.error(`Failed to upload LogicSig`, {
				position: 'top-right',
				autoClose: 8000,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
				toastId: 'error-sig',
			});
			console.log('Error uploading hash: ', error);
		}
		//const hash = new Uint8Array(Buffer.from('ipfs-here'));
		//setHashVal(hash);
		//writeUserData(result, hash, lsa);
	};
	function encodeToUint64(count: number) {
		let values: Array<number> = [1, 23, 24, 25];
		//values.push();
		let va: Uint8Array = new Uint8Array();

		for (let n = 0; n < count; n++) {
			let a = algosdk.encodeUint64(values[n]);
			va.set(a, n);
		}
		return va;
	}
	const stake = async () => {
		try {
			const suggestedParams = await apiGetTxnParams(ChainType.TestNet);
			const assetID = algosdk.encodeUint64(NFTColl);
			const amount64 = algosdk.encodeUint64(Number(newAmount));
			const validRound64 = algosdk.encodeUint64(validRound);
			/* 	const lsaHashFull = new TextDecoder().decode(hashVal);
			const lsaHashFullTo8 = lsaHashFull.substring(0, 8);
			const lsaHash8 = Uint8Array.from(Buffer.from(lsaHashFullTo8)); */
			console.log(hashIpfs);
			const ipfsLsaHash = Uint8Array.from(Buffer.from(hashIpfs));

			const txn1 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
				from: result,
				to: result,
				amount: 0,
				assetIndex: NFTColl,
				note: new Uint8Array(Buffer.from('Opt-in to NFT')),
				suggestedParams,
			});
			const txn2 = algosdk.makeApplicationNoOpTxnFromObject({
				from: result,
				appIndex: APP_ID,
				appArgs: [
					Uint8Array.from(Buffer.from('lend')),
					assetID,
					amount64,
					ipfsLsaHash,
					validRound64,
				],
				note: ipfsLsaHash,
				suggestedParams,
			});
			const txns: Array<algosdk.Transaction> = [];
			const signedTxs: Array<Uint8Array> = [];
			const signedGroup: Array<Array<Uint8Array>> = [];

			const myAlgoConnect = new MyAlgoConnect();

			const optin = await checkAssetOptin(DUSD, result);
			if ((optin.length = 1 && !optin[0]['deleted'])) {
				txns.push(txn2);
				const signedTx = await myAlgoConnect.signTransaction(
					txns.map((txn) => txn.toByte())
				);
				console.log(signedTx);
				for (const i in signedTx) {
					signedTxs.push(signedTx[i].blob);
				}

				signedGroup.push(signedTxs);
				// Submit the transaction
				toast.info(`Submitting...`, {
					position: 'top-right',
					autoClose: 3000,
					hideProgressBar: false,
					closeOnClick: true,
					pauseOnHover: true,
					draggable: true,
					toastId: 'info-id',
				});
				return await submitTransaction(signedGroup);
			}

			txns.push(txn1);
			txns.push(txn2);

			const signedTx = await myAlgoConnect.signTransaction(
				txns.map((txn) => txn.toByte())
			);
			console.log(signedTx);
			for (const i in signedTx) {
				signedTxs.push(signedTx[i].blob);
			}

			signedGroup.push(signedTxs);

			// Submit the transaction
			return await submitTransaction(signedGroup);
		} catch (error) {
			console.log(error);
			toast.error(`Request Rejected`, {
				position: 'top-right',
				autoClose: 8000,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
			});
		}
	};
	async function submitTransaction(signedGroup: Array<Array<Uint8Array>>) {
		signedGroup.forEach(async (signedTxn, index) => {
			try {
				const confirmedRound = await apiSubmitTransactions(
					ChainType.TestNet,
					signedTxn
				);
				console.log(`Transaction confirmed at round ${confirmedRound}`);
				toast.success(`Confirmed in round ${confirmedRound}`, {
					position: 'top-right',
					autoClose: 10000,
					hideProgressBar: false,
					closeOnClick: true,
					pauseOnHover: true,
					draggable: true,
					toastId: 'success-id',
				});
			} catch (error) {
				console.error(`Error submitting transaction: `, error);
				toast.error(`Error submitting transaction`, {
					position: 'top-right',
					autoClose: 10000,
					hideProgressBar: false,
					closeOnClick: true,
					pauseOnHover: true,
					draggable: true,
					toastId: 'error-id',
				});
			}
		});
	}

	return (
		<>
			<ToastContainer
				hideProgressBar={false}
				newestOnTop
				closeOnClick
				rtl={false}
				pauseOnFocusLoss
				draggable
				pauseOnHover
			/>
			{hashIpfs ? (
				<button
					onClick={(e) => {
						e.preventDefault();
						stake();
					}}
					className='bg-gradient-to-r from-gray-100 to-red-300 p-3 rounded-md ring-gray-200 text-sm text-gray-800 hover:ring-1 focus:outline-none active:ring-gray-300 hover:shadow-md'
				>
					Stake - Promise
				</button>
			) : (
				<button
					onClick={(e) => {
						e.preventDefault();
						logic();
					}}
					className='btn'
				>
					Sign
				</button>
			)}
		</>
	);
}
function getUint8Args(amount: number, round: number) {
	return [
		algosdk.encodeUint64(USDC),
		algosdk.encodeUint64(amount),
		algosdk.encodeUint64(round),
		algosdk.encodeUint64(APP_ID),
	];
}
export async function checkAssetOptin(assetId: number, address: string) {
	const accountInfo = await testNetClientindexer
		.lookupAccountAssets(address)
		.assetId(assetId)
		.do();
	if (accountInfo.assets.length > 0) {
		return accountInfo['assets'];
	}
	return false;
}
