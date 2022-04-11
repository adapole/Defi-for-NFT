import MyAlgoConnect from '@randlabs/myalgo-connect';
import algosdk from 'algosdk';
import { useState, useCallback, useEffect } from 'react';
import {
	apiGetTxnParams,
	ChainType,
	testNetClientalgod,
} from '../pages/helpers/api';
import { create } from 'ipfs-http-client';
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

	let rounds = round;
	if (round == undefined) rounds = 10;

	const bigAmount = amount.toString();
	const newAmount = bigAmount + '000000';
	const [result, setResult] = useState('');
	const [validRound, setValidRound] = useState(2);
	const [hashVal, setHashVal] = useState(new Uint8Array());
	const [hashIpfs, setHashIpfs] = useState('');
	const myAlgoConnect = new MyAlgoConnect({ disableLedgerNano: false });
	const settings = {
		shouldSelectOneAccount: false,
		openManager: false,
	};

	const connect = async () => {
		const accounts = await myAlgoConnect.connect(settings);
		console.log(accounts);
		const sender = accounts[0].address;
		setResult(sender);
		console.log(sender);
	};
	const [fileUrl, updateFileUrl] = useState(``);
	useEffect(() => {
		console.log('render for ipfsPath');

		/* return () => {
			console.log('return from change, CleanUP');
		}; */
	}, [hashIpfs]);

	async function onChange(e: any) {
		const file = e.target.files[0];
		try {
			const added = await ipfs.add(file);
			const url = `https://ipfs.infura.io/ipfs/${added.path}`;
			updateFileUrl(url);
			console.log(url);
		} catch (error) {
			console.log('Error uploading file: ', error);
		}
	}
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
			const added = await ipfs.add(lsa);
			const url = `https://ipfs.infura.io/ipfs/${added.path}`;
			updateFileUrl(url);
			//console.log(url);
			const ipfsPath = added.path;
			console.log(added.path);
			console.log(added.cid.toString());

			//console.log(JSON.stringify(chunks));
			setHashIpfs(ipfsPath);
			//console.log(hashVal);
			/* const chunks = [];
			for await (const chunk of ipfs.cat(ipfsPath)) {
				chunks.push(chunk);
			}
			console.log(chunks); */
		} catch (error) {
			console.log('Error uploading hash: ', error);
		}
		//const hash = new Uint8Array(Buffer.from('ipfs-here'));
		//setHashVal(hash);
		//writeUserData(result, hash, lsa);
	};
	const stake = async () => {
		const suggestedParams = await apiGetTxnParams(ChainType.TestNet);
		const assetID = algosdk.encodeUint64(77141623);
		const amount64 = algosdk.encodeUint64(Number(newAmount));
		const validRound64 = algosdk.encodeUint64(validRound);
		const lsaHashFull = new TextDecoder().decode(hashVal);
		const lsaHashFullTo8 = lsaHashFull.substring(0, 8);
		const lsaHash8 = Uint8Array.from(Buffer.from(lsaHashFullTo8));
		console.log(hashIpfs);
		const ipfsLsaHash = Uint8Array.from(Buffer.from(hashIpfs));

		const txn = algosdk.makeApplicationNoOpTxnFromObject({
			from: result,
			appIndex: 79061945,
			appArgs: [
				Uint8Array.from(Buffer.from('lend')),
				assetID,
				amount64,
				ipfsLsaHash,
				validRound64,
			],
			suggestedParams,
		});

		const myAlgoConnect = new MyAlgoConnect();
		const signedTxn = await myAlgoConnect.signTransaction(txn.toByte());
		console.log(signedTxn);
		let txId = txn.txID().toString();
		// Submit the transaction
		await testNetClientalgod.sendRawTransaction(signedTxn.blob).do();

		// Wait for confirmation
		let confirmedTxn = await algosdk.waitForConfirmation(
			testNetClientalgod,
			txId,
			4
		);
		//Get the completed Transaction
		console.log(
			'Transaction ' +
				txId +
				' confirmed in round ' +
				confirmedTxn['confirmed-round']
		);
	};

	function writeUserData(sender: any, hash: Uint8Array, intUrl: Uint8Array) {
		/* const db = getDatabase(firebase);
		const postListRef = ref(db, 'users');
		const newPostRef = push(postListRef);
		set(newPostRef, {
			useraddress: sender,
			uint8_hash: hash,
			uint8_lsa: intUrl,
		}); */
		//set(ref(db, 'users/' + lsaId), {
		//	useraddress: hash,
		//	uint8_lsa: intUrl,
		//});const string = new TextDecoder().decode(hash);
	}

	return (
		<>
			<button
				onClick={(e) => {
					e.preventDefault();
					stake();
				}}
				className='btn'
			>
				Stake
			</button>
			<button
				onClick={(e) => {
					e.preventDefault();
					logic();
				}}
				className='btn'
			>
				Logic Sign
			</button>
			<button
				onClick={(e) => {
					e.preventDefault();
					connect();
				}}
				className='btn'
			>
				Connect
			</button>
		</>
	);
}
function getUint8Args(amount: number, round: number) {
	return [
		algosdk.encodeUint64(10458941),
		algosdk.encodeUint64(amount),
		algosdk.encodeUint64(round),
		algosdk.encodeUint64(79061945),
	];
}