import { CheckCircleIcon } from '@heroicons/react/solid';
import { formatJsonRpcRequest } from '@json-rpc-tools/utils';
import MyAlgoConnect from '@randlabs/myalgo-connect';
import WalletConnect from '@walletconnect/client';
import algosdk from 'algosdk';
import { create } from 'ipfs-http-client';
import React from 'react';
import { useEffect, useState } from 'react';
import {
	apiGetTxnParams,
	apiSubmitTransactions,
	ChainType,
} from '../lib/helpers/api';
import { DUSD, NFTColl } from '../lib/helpers/constants';
import { Scenario, ScenarioReturnType } from '../lib/helpers/scenarios';
import {
	IAssetData,
	IWalletTransaction,
	SignTxnParams,
} from '../lib/helpers/types';
import Loader from './Loader';
import Modal from './Modal';

type Props = {
	assets: IAssetData[];
	connector: WalletConnect | null;
	address: string;
	chain: ChainType;
	wc: boolean;
	mconnector: MyAlgoConnect | null;
};
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
export default function Faucets({
	assets,
	connector,
	address,
	chain,
	wc,
	mconnector,
}: Props) {
	const [showModal, setShowModal] = useState(false);
	const [result, setResult] = useState<IResult | null>(null);
	const [pendingRequest, setPendingRequest] = useState(false);
	const [pendingSubmissions, setPendingSubmissions] = useState([]);
	const [NFTCLogicSig, setNFTCLogicSig] = useState(new Uint8Array());
	const [dusdLogicSig, setDUSDLogicSig] = useState(new Uint8Array());

	const NFTColtoken = assets.find(
		(asset: IAssetData) => asset && asset.id === NFTColl
	);
	const ipfs = create({
		host: 'ipfs.infura.io',
		port: 5001,
		protocol: 'https',
	});
	/**
	 * Returns Uint8array of LogicSig from ipfs, throw error
	 * @param ipfsPath hash string of ipfs path
	 */
	const GetLogicSig = async (ipfsPath: string): Promise<Uint8Array> => {
		const chunks = [];
		for await (const chunk of ipfs.cat(ipfsPath)) {
			chunks.push(chunk);
		}
		return chunks[0];
	};

	const dispenceNFTCOL = async () => {
		const lg = await GetLogicSig(
			'QmRsvCLVzEkE3QEjkpHmKFuCRiLtN34d1sxs1xApcaJuhp'
		);
		console.log(lg);
		setNFTCLogicSig(lg);
	};
	useEffect(() => {
		dispenceNFTCOL();
	}, []);
	const colAssetTransferTxn: Scenario = async (
		chain: ChainType,
		address: string
	): Promise<ScenarioReturnType> => {
		const suggestedParams = await apiGetTxnParams(chain);
		const assetIndex = NFTColl;

		const txn1 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
			from: address,
			to: address,
			amount: 0,
			assetIndex,
			note: new Uint8Array(Buffer.from('Opt-in to NFT')),
			suggestedParams,
		});

		const txn2 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
			from: 'XCXQVUFRGYR5EKDHNVASR6PZ3VINUKYWZI654UQJ6GA5UVVUHJGM5QCZCY',
			to: address,
			amount: 10,
			assetIndex,
			note: new Uint8Array(Buffer.from('dispence NFT')),
			suggestedParams,
		});

		const txnsToSign = [{ txn: txn1 }, { txn: txn2, signers: [] }];

		algosdk.assignGroupID(txnsToSign.map((toSign) => toSign.txn));
		return [txnsToSign];
	};
	const scenarios1: Array<{ name: string; scenario1: Scenario }> = [
		{
			name: 'Dispense',
			scenario1: colAssetTransferTxn,
		},
	];
	const toggleModal = () => {
		setShowModal(!showModal);
		setPendingSubmissions([]);
	};
	function selectLogicSigDispence(txn: algosdk.Transaction): Uint8Array {
		if (txn.assetIndex === NFTColl) {
			return NFTCLogicSig;
		}
		/* if (txn.assetIndex === DUSD) {
			return dusdLogicSig;
		} */
		throw new Error(`Cannot get transaction assetIndex`);
	}
	function signTxnLogicSigWithTestAccount(
		txn: algosdk.Transaction
	): Uint8Array {
		let lsa = selectLogicSigDispence(txn);
		if (txn.assetIndex === NFTColl) {
			let lsig = algosdk.LogicSigAccount.fromByte(lsa);
			let signedTxn = algosdk.signLogicSigTransactionObject(txn, lsig);
			console.log(signedTxn.txID);
			return signedTxn.blob;
		}
		/* if (txn.assetIndex === DUSD) {
			let lsig = algosdk.LogicSigAccount.fromByte(lsa);
			let signedTxn = algosdk.signLogicSigTransactionObject(txn, lsig);
			console.log(signedTxn.txID);
			return signedTxn.blob;
		}
 */
		throw new Error(`Cannot sign transaction from account`);
	}
	async function signTxnLogic(
		scenario1: Scenario,
		connector: WalletConnect,
		address: string,
		chain: ChainType
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
	return (
		<>
			<div className='flex flex-wrap sm:flex-none sm:whitespace-nowrap sm:space-x-10 md:space-x-20'>
				<div className='flex w-full max-w-2xl items-center justify-evenly sm:w-48 sm:flex-wrap bg-white rounded-lg shadow-md p-6 mt-4 hover:cursor-pointer group'>
					{NFTColtoken && NFTColtoken.amount > 5 ? (
						<>
							<div className='flex justify-between items-center'>
								<h1 className='uppercase text-sm sm:text-base tracking-wide'>
									Dispencer
								</h1>
								<div>
									<CheckCircleIcon className='h-4 sm:h-5 sm:mr-3 text-gray-500 cursor-pointer transition duration-100 transform hover:scale-125' />
									<span className='absolute w-auto p-2 m-2 min-w-max left-48 rounded-md text-white bg-gray-900 text-xs font-bold transition-all duration-100 scale-0 origin-left group-hover:scale-100'>
										You already have Collateral NFT!
									</span>
								</div>
							</div>
							<div className='mb-0.5 font-semibold'>
								<span className='text-3xl sm:text-5xl mr-2'>10</span>
								<span className='text-xl sm:text-2xl'>Lft-Jina</span>
							</div>
							<div className='content-center'>
								<div>
									{scenarios1.map(({ name, scenario1 }) => (
										<button
											className='relative px-6 py-1 sm:px-7 sm:py-2 rounded-md leading-none flex items-center bg-[#18393a] text-gray-100'
											key={name}
											onClick={(e) => {
												e.preventDefault();
												signTxnLogic(
													scenario1,
													connector as WalletConnect,
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
						</>
					) : (
						<>
							<div className='flex justify-between items-center'>
								<h1 className='uppercase text-sm sm:text-base tracking-wide'>
									Dispencer
								</h1>
							</div>
							<div className='mb-0.5 font-semibold'>
								<span className='text-3xl sm:text-5xl mr-2'>10</span>
								<span className='text-xl sm:text-2xl'>Lft-Jina</span>
							</div>
							<div className='content-center'>
								<div>
									{scenarios1.map(({ name, scenario1 }) => (
										<button
											className='relative px-6 py-1 sm:px-7 sm:py-2 rounded-md leading-none flex items-center bg-[#2CB7BC] text-gray-100 opacity-75 hover:opacity-100'
											key={name}
											onClick={(e) => {
												e.preventDefault();
												signTxnLogic(
													scenario1,
													connector as WalletConnect,
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
						</>
					)}
				</div>

				<div className='flex w-full max-w-2xl items-center justify-evenly sm:w-48 sm:flex-wrap bg-white rounded-lg shadow-md p-6 mt-4 hover:cursor-pointer group'>
					<div className='flex justify-between items-center'>
						<h1 className='uppercase text-sm sm:text-base tracking-wide'>
							Dispencer
						</h1>
					</div>
					<div className='mb-0.5 font-semibold'>
						<span className='text-3xl sm:text-5xl mr-2'>5</span>
						<span className='text-xl sm:text-2xl'>Algo</span>
					</div>
					<div className='content-center'>
						<div>
							<a
								target='_blank'
								href='https://dispenser.testnet.aws.algodev.network/'
								rel='noopener noreferrer'
								onClick={() => {
									"document.getElementByName('account').value='PROAQSK6TQLWFIAGW3J7N7JBFXHL73S6IQXUXWQTBUVP56RGGE6YSGYBVA';";
								}}
								className='relative px-6 py-1 sm:px-7 sm:py-2 rounded-md leading-none flex items-center bg-[#2CB7BC] text-gray-100 opacity-75 hover:opacity-100'
							>
								Go
							</a>
						</div>
					</div>
				</div>

				<div className='flex w-full max-w-2xl items-center justify-evenly sm:w-48 sm:flex-wrap bg-white rounded-lg shadow-md p-6 mt-4 hover:cursor-pointer group'>
					<div className='flex justify-between items-center'>
						<h1 className='uppercase text-sm sm:text-base tracking-wide'>
							Dispencer
						</h1>
					</div>
					<div className='mb-0.5 font-semibold'>
						<span className='text-3xl sm:text-5xl mr-2'>1</span>
						<span className='text-xl sm:text-2xl'>USDC</span>
					</div>
					<div className='content-center'>
						<div>
							<a
								target='_blank'
								href='https://usdcfaucet.com/'
								rel='noopener noreferrer'
								onClick={() => {
									"document.getElementByName('account').value='PROAQSK6TQLWFIAGW3J7N7JBFXHL73S6IQXUXWQTBUVP56RGGE6YSGYBVA';";
								}}
								className='relative px-6 py-1 sm:px-7 sm:py-2 rounded-md leading-none flex items-center bg-[#2CB7BC] text-gray-100 opacity-75 hover:opacity-100'
							>
								Go
							</a>
						</div>
					</div>
				</div>
			</div>
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
		</>
	);
}
