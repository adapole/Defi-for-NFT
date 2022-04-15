import type { NextPage } from 'next';
import Head from 'next/head';
import React from 'react';
import WalletConnect from '@walletconnect/client';
import QRCodeModal from 'algorand-walletconnect-qrcode-modal';
import { IInternalEvent } from '@walletconnect/types';
import { formatJsonRpcRequest } from '@json-rpc-tools/utils';
import algosdk from 'algosdk';
import {
	apiGetAccountAssets,
	apiGetTxnParams,
	apiSubmitTransactions,
	ChainType,
} from './helpers/api';
import { IAssetData, IWalletTransaction, SignTxnParams } from './helpers/types';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import Header from '../components/Header';
import { ScenarioReturnType, Scenario } from './scenarios';
import Body from '../components/Body';
import MultipleValueTextInput from '../components/MultipleValueTextInput';
import Ripple3D from '../components/3Dripple';
import Dashboard from '../components/Dashboard';
//import WalletSelector from '../components/WalletSelector';
import dynamic from 'next/dynamic';
const DynamicComponentWithNoSSR = dynamic(
	() => import('../components/WalletSelector'),
	{
		ssr: false,
	}
);

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

interface IAppState {
	connector: WalletConnect | null;
	fetching: boolean;
	connected: boolean;
	showModal: boolean;
	pendingRequest: boolean;
	signedTxns: Uint8Array[][] | null;
	pendingSubmissions: Array<number | Error>;
	uri: string;
	accounts: string[];
	address: string;
	result: IResult | null;
	chain: ChainType;
	assets: IAssetData[];
}

const INITIAL_STATE: IAppState = {
	connector: null,
	fetching: false,
	connected: false,
	showModal: false,
	pendingRequest: false,
	signedTxns: null,
	pendingSubmissions: [],
	uri: '',
	accounts: [],
	address: '',
	result: null,
	chain: ChainType.TestNet,
	assets: [],
};

class Home extends React.Component<unknown, IAppState> {
	public state: IAppState = {
		...INITIAL_STATE,
	};

	public walletConnectInit = async () => {
		// bridge url
		const bridge = 'https://bridge.walletconnect.org';

		// create new connector
		const connector = new WalletConnect({ bridge, qrcodeModal: QRCodeModal });

		await this.setState({ connector });

		// check if already connected
		if (!connector.connected) {
			// create new session
			await connector.createSession();
		}

		// subscribe to events
		await this.subscribeToEvents();
		//await this.JinaAppOptin();
	};
	public subscribeToEvents = () => {
		const { connector } = this.state;

		if (!connector) {
			return;
		}

		connector.on('session_update', async (error, payload) => {
			console.log(`connector.on("session_update")`);

			if (error) {
				throw error;
			}

			const { accounts } = payload.params[0];
			this.onSessionUpdate(accounts);
		});

		connector.on('connect', (error, payload) => {
			console.log(`connector.on("connect")`);

			if (error) {
				throw error;
			}

			this.onConnect(payload);
		});

		connector.on('disconnect', (error, payload) => {
			console.log(`connector.on("disconnect")`);

			if (error) {
				throw error;
			}

			this.onDisconnect();
		});

		if (connector.connected) {
			const { accounts } = connector;
			const address = accounts[0];
			this.setState({
				connected: true,
				accounts,
				address,
			});
			this.onSessionUpdate(accounts);
		}

		this.setState({ connector });
	};

	public killsession = async () => {
		const { connector } = this.state;
		if (connector) {
			connector.killSession();
		}
		this.resetApp();
	};

	public chainupdate = (newChain: ChainType) => {
		this.setState({ chain: newChain }, this.getAccountAssets);
	};

	public resetApp = async () => {
		await this.setState({ ...INITIAL_STATE });
	};

	public onConnect = async (payload: IInternalEvent) => {
		const { accounts } = payload.params[0];
		const address = accounts[0];
		await this.setState({
			connected: true,
			accounts,
			address,
		});
		this.getAccountAssets();
	};

	public onDisconnect = async () => {
		this.resetApp();
	};

	public onSessionUpdate = async (accounts: string[]) => {
		const address = accounts[0];
		await this.setState({ accounts, address });
		await this.getAccountAssets();
	};

	public getAccountAssets = async () => {
		const { address, chain } = this.state;
		this.setState({ fetching: true });
		try {
			// get account balances
			const assets = await apiGetAccountAssets(chain, address);

			await this.setState({ fetching: false, address, assets });
		} catch (error) {
			console.error(error);
			await this.setState({ fetching: false });
		}
	};

	public toggleModal = () =>
		this.setState({
			showModal: !this.state.showModal,
			pendingSubmissions: [],
		});

	public singleJinaAppOptIn: Scenario = async (
		chain: ChainType,
		address: string
	): Promise<ScenarioReturnType> => {
		//
		const suggestedParams = await apiGetTxnParams(chain);

		const appIndex = 79061945;

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
	public signApp = async (scenario: Scenario) => {
		const { connector, address, chain } = this.state;
		try {
			if (!connector) return;
			const txnsToSign = await scenario(chain, address);
			const flatTxns = txnsToSign.reduce((acc, val) => acc.concat(val), []);
			//return [txnsToSign]
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

						return;
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
			this.setState({
				connector,
				pendingRequest: false,
				signedTxns,
				result: formattedResult,
			});

			// Start Submitting
			this.setState({ pendingSubmissions: signedTxns.map(() => 0) });
			signedTxns.forEach(async (signedTxn, index) => {
				try {
					const confirmedRound = await apiSubmitTransactions(chain, signedTxn);

					this.setState((prevState) => {
						return {
							pendingSubmissions: prevState.pendingSubmissions.map((v, i) => {
								if (index === i) {
									return confirmedRound;
								}
								return v;
							}),
						};
					});

					console.log(`Transaction confirmed at round ${confirmedRound}`);
				} catch (err) {
					this.setState((prevState) => {
						return {
							pendingSubmissions: prevState.pendingSubmissions.map((v, i) => {
								if (index === i) {
									return err;
								}
								return v;
							}),
						};
					});

					console.error(`Error submitting transaction at index ${index}:`, err);
				}
			});
		} catch (error) {
			console.error(error);
			this.setState({ connector, pendingRequest: false, result: null });
		}
	};
	public scenarios: Array<{ name: string; scenario: Scenario }> = [
		{
			name: 'Optin To Jina',
			scenario: this.singleJinaAppOptIn,
		},
	];
	public JinaAppOptin = async () => {
		const { connector } = this.state;

		if (!connector) {
			return;
		}

		// open Modal and prompt to optin, if not already
		this.toggleModal();

		this.setState({ pendingRequest: true, showModal: true });
		//await testNetClientalgod.accountApplicationInformation(address,index).do()
	};
	public returnWallet = async (data: any) => {
		if (!!data) {
			console.log(data.connector.check());
			console.log(await data.connector.connect());
			console.log(data.connector.provider);
		}
	};
	public render = () => {
		const {
			connector,
			chain,
			assets,
			address,
			connected,
			fetching,
			showModal,
			pendingRequest,
			pendingSubmissions,
			result,
		} = this.state;

		return (
			<div>
				<Head>
					<title>Next App</title>
					<meta name='name' content='Defi for NFT' />
					<meta name='description' content='Connect to next app' />
					<link rel='icon' href='/favicon.ico' />
				</Head>

				<div>
					<Header
						connected={connected}
						address={address}
						killsession={this.killsession}
						chain={chain}
						chainupdate={this.chainupdate}
					/>
					<header className='flex w-full p-5 justify-between text-sm text-gray-500'>
						{!address && !assets.length ? (
							<>
								<div className='flex space-x-4 items-center'>
									<p className='link'>About</p>
									<DynamicComponentWithNoSSR
										returnWallet={this.returnWallet}
										wallets={['myalgowallet', 'walletconnect']}
									/>
								</div>
								<div className='flex space-x-4 items-center'>
									<div className='relative group'>
										<div className='absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-md blur opacity-75 group-hover:opacity-100 transition duration-600 group-hover:duration-200 animate-tilt'></div>
										<button
											onClick={this.walletConnectInit}
											className='relative px-7 py-2 rounded-md leading-none flex items-center divide-x divide-gray-600 bg-black'
										>
											<span className='pr-2 text-gray-100'>Connect wallet</span>
										</button>
									</div>
								</div>
							</>
						) : (
							<></>
						)}
					</header>
					<div>
						{/* Body */}
						{!address && !assets.length ? (
							<>{/* <Dashboard /> */}</>
						) : (
							<>
								<Body
									assets={assets}
									connector={connector}
									address={address}
									chain={chain}
								/>
							</>
						)}
					</div>
				</div>
				<Modal show={showModal} toggleModal={this.toggleModal}>
					{pendingRequest ? (
						<div className='w-full relative break-words'>
							<div className='mt-1 mb-0 font-bold text-xl'>
								{'OptIn To Jina-App'}
							</div>
							<div className='h-full min-h-2 flex flex-col justify-center items-center break-words'>
								<Loader />
								{/* Click to activate optin */}
								{this.scenarios.map(({ name, scenario }) => (
									<button
										className='relative mt-6 px-6 py-1 sm:px-7 sm:py-2 rounded-md leading-none flex items-center bg-[#18393a] text-gray-100'
										key={name}
										onClick={(e) => {
											e.preventDefault();
											this.signApp(scenario);
										}}
									>
										{name}
									</button>
								))}
								<p className='mt-4'>
									{'Approve or reject request using your wallet'}
								</p>
								<p className=' mt-0.5 text-red-500'>
									{'OptIn, only If you have not done so before'}
								</p>
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
			</div>
		);
	};
}

export default Home;
