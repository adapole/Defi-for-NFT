import MyAlgoConnect from '@randlabs/myalgo-connect';
import WalletConnect from '@walletconnect/client';
import algosdk from 'algosdk';
import React, { useCallback, useEffect, useState } from 'react';
import {
	apiGetTxnParams,
	ChainType,
	testNetClientalgod,
	testNetClientindexer,
} from '../lib/helpers/api';
import { APP_ID } from '../lib/helpers/constants';
import { Scenario, ScenarioReturnType } from '../lib/helpers/scenarios';
import { IAssetData } from '../lib/helpers/types';
import Loader from './Loader';
import Modal from './Modal';

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

export default function AppOptin(props: {
	connector: WalletConnect | null;
	address: string;
	chain: ChainType;
	wc: boolean;
	mconnector: MyAlgoConnect | null;
}) {
	const { connector, address, chain, wc, mconnector } = props;
	const [hasOpted, setHasOpted] = useState(false);
	const [showModal, setShowModal] = useState(false);
	const [result, setResult] = useState<IResult | null>(null);
	const [pendingRequest, setPendingRequest] = useState(false);
	const [pendingSubmissions, setPendingSubmissions] = useState([]);
	const checkOptinIndexer = async () => {
		const accountInfo = await testNetClientindexer
			.lookupAccountAppLocalStates(address)
			.do();
		//console.log(accountInfo['apps-local-states']);
		return accountInfo['apps-local-states'];
	};
	const optin = async () => {
		const applications = await checkOptinIndexer();
		if (applications === null) {
			//console.log('Optin');
			// open Modal and prompt to optin
			toggleModal();

			return;
		}
		for (let i = 0; i < applications.length; i++) {
			if (applications[i]['id'] === APP_ID && !applications[i]['deleted']) {
				return;
			}
			//console.log('Opt in...');
			// open Modal and prompt to optin
			toggleModal();
		}
	};
	const singleAppOptIn: Scenario = async (
		chain: ChainType,
		address: string
	): Promise<ScenarioReturnType> => {
		//
		const suggestedParams = await apiGetTxnParams(chain);

		const appIndex = APP_ID;

		const txn = algosdk.makeApplicationOptInTxnFromObject({
			from: address,
			appIndex,
			note: new Uint8Array(Buffer.from('OptIn Jina')),
			appArgs: [],
			suggestedParams,
		});

		const txnsToSign = [{ txn }];

		return [txnsToSign];
	};
	const scenarios: Array<{ name: string; scenario: Scenario }> = [
		{
			name: 'Optin To App',
			scenario: singleAppOptIn,
		},
	];
	const toggleModal = () => {
		setShowModal(!showModal);
		setPendingSubmissions([]);
	};
	function filterByID(item: any) {
		if (item.txn && item.signers === undefined) {
			return true;
		}

		return false;
	}
	async function myAlgoSign(
		scenario: Scenario,
		mconnector: MyAlgoConnect,
		address: string,
		chain: ChainType
	) {
		if (!mconnector) {
			console.log('No connector found!');
			return;
		}
		try {
			const txnsToSign = await scenario(chain, address);
			console.log(txnsToSign);
			console.log('MyAlgo Signing');
			// open modal
			//toggleModal();
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

					//const signedTxn = algosdk.decodeSignedTransaction(rawSignedTxn);

					//const txn = signedTxn.txn as unknown as algosdk.Transaction;
					const txID = signedTxn[0].txID;
					/* 					const unsignedTxID = txnsToSign[group][i].txn.txID();

					if (txID !== unsignedTxID) {
						throw new Error(
							`Signed transaction at index ${i} differs from unsigned transaction. Got ${txID}, expected ${unsignedTxID}`
						);
					} */

					return {
						txID,
						signingAddress: address,
						signature: Buffer.from('signedTxn[0].blob').toString('base64'),
					};
				});
			});

			// Start Submitting
			setPendingRequest(false);
			// format displayed result
			const formattedResult: IResult = {
				method: 'algo_signTxn',
				body: signedTxnInfo,
			};
			setResult(formattedResult);

			setPendingSubmissions(signedTxn.map(() => 0) as []);
			// Submit the transaction
			signedTxns.forEach(async (signedTxn, index) => {});

			try {
				await testNetClientalgod.sendRawTransaction(signedTxn[0].blob).do();
				if (txIdd) {
					// Wait for confirmation
					let confirmedTxn = await algosdk.waitForConfirmation(
						testNetClientalgod,
						txIdd,
						4
					);
					const pendingsubm = [confirmedTxn['confirmed-round']];
					setPendingSubmissions(pendingsubm as []);
					console.log(
						`Transaction confirmed at round ${confirmedTxn['confirmed-round']}`
					);
				}
			} catch (err) {
				console.error(`Error submitting transaction: `, err);
			}
		} catch (err) {
			console.error(`Error submitting transaction at index`);
		}
	}
	useEffect(() => {
		optin();
		setPendingRequest(true);
	}, [hasOpted]);

	return (
		<>
			<Modal show={showModal} toggleModal={toggleModal}>
				{pendingRequest ? (
					<div className='w-full relative break-words'>
						<div className='mt-1 mb-0 font-bold text-xl'>{'OptIn To App'}</div>
						<div className='h-full min-h-2 flex flex-col justify-center items-center break-words'>
							<Loader />
							{/* Click to activate optin */}
							{scenarios.map(({ name, scenario }) => (
								<button
									className='btn mt-2'
									key={name}
									onClick={(e) => {
										e.preventDefault();
										myAlgoSign(
											scenario,
											mconnector as MyAlgoConnect,
											address,
											chain
										);
									}}
								>
									{name}
								</button>
							))}
						</div>
					</div>
				) : result ? (
					<div className='w-full relative break-words'>
						<div className='mt-1 mb-0 font-bold text-xl'>
							{'Call Request Approved'}
						</div>
						{pendingSubmissions.map((submissionInfo, index) => {
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
										{result.body.map((signedTxns, index) => (
											<div className='w-full flex mt-1 mb-0' key={index}>
												<div className='w-1/6 font-bold'>{`TxID: `}</div>
												<div className='w-10/12 font-mono'>
													{signedTxns.map((txn, txnIndex) => (
														<div key={txnIndex}>
															{!!txn?.txID && <p>{txn.txID}</p>}
														</div>
													))}
												</div>
											</div>
										))}
									</div>
									<div className='mt-1 mb-0 font-bold text-xl' key={key}>
										{content}
									</div>
								</>
							);
						})}
					</div>
				) : (
					<div className='w-full relative break-words'>
						<div className='mt-1 mb-0 font-bold text-xl'>
							{'Call Request Rejected'}
						</div>
					</div>
				)}
			</Modal>
		</>
	);
}
