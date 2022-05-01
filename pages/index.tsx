import type { NextPage } from 'next';
import Head from 'next/head';
import React, { Component } from 'react';
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
	testNetClientalgod,
	testNetClientindexer,
} from '../lib/helpers/api';
import {
	IAssetData,
	IWalletTransaction,
	SignTxnParams,
} from '../lib/helpers/types';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import Header from '../components/Header';
import { ScenarioReturnType, Scenario } from '../lib/helpers/scenarios';

//import Dashboard from '../components/Dashboard';
//import WalletSelector from '../components/WalletSelector';
import dynamic from 'next/dynamic';
import MyAlgoConnect from '@randlabs/myalgo-connect';
import Circle from '../components/Circle';
import { APP_ID } from '../lib/helpers/constants';
import FrontPage from '../components/FrontPage';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const AppOptin = dynamic(() => import('../components/AppOptin'), {
	ssr: false,
});
//import { Accounts } from '@randlabs/myalgo-connect';
const Body = dynamic(() => import('../components/Body'), {
	ssr: false,
});

/* export async function getServerSideProps() {
	const post = await prisma.post.create({
		data: {
			title: 'My first post',
			body: 'My first post body',
		},
	});
	console.log(post);
	return null;
} */
async function savePost(post: any) {
	const response = await fetch('/api/posts', {
		method: 'POST',
		body: JSON.stringify(post),
	});
	if (!response.ok) {
		throw new Error(response.statusText);
	}
	return await response.json();
}
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
	wc: boolean;
	mconnector: MyAlgoConnect | null;
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
	wc: false,
	mconnector: null,
};

class Home extends React.Component<unknown, IAppState> {
	public state: IAppState = {
		...INITIAL_STATE,
	};
	public DynamicComponentWithNoSSR = dynamic(
		() => import('../components/WalletSelector'),
		{
			ssr: false,
		}
	);
	public walletConnectInit = async () => {
		// bridge url
		const bridge = 'https://bridge.walletconnect.org';

		// create new connector
		const connector = new WalletConnect({
			bridge,
			qrcodeModal: QRCodeModal,
		});
		await this.setStateAsync({ connector, wc: true });
		/* clientMeta: {
			description: 'My description ',
			url: 'http://localhost:3000',
			icons: ['../public/favicon.ico'],
			name: 'The name',
		}, */
		// check if already connected
		if (!connector.connected) {
			// create new session
			await connector.createSession();
		}

		// subscribe to events
		await this.subscribeToEvents();
		await this.JinaAppOptin();
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
	public clearsession = async () => {
		await this.setStateAsync({ ...INITIAL_STATE });
	};
	public chainupdate = (newChain: ChainType) => {
		this.setState({ chain: newChain }, this.getAccountAssets);
	};

	public resetApp = async () => {
		await this.setState({ ...INITIAL_STATE });
	};
	public checkOptin = async () => {
		const { address } = this.state;
		const accountInfo = await testNetClientindexer
			.lookupAccountAppLocalStates(address)
			.do();
		//console.log(accountInfo['apps-local-states']);
		return accountInfo['apps-local-states'];
	};
	setStateAsync(state: any) {
		return new Promise((resolve: any) => {
			this.setState(state, resolve);
		});
	}
	public onConnect = async (payload: IInternalEvent) => {
		const { accounts } = payload.params[0];
		const address = accounts[0];
		await this.setStateAsync({
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
		console.log('Got 8');

		await this.getAccountAssets();
	};

	public getAccountAssets = async () => {
		const { address, chain } = this.state;
		this.setState({ fetching: true });
		try {
			// get account balances
			const assets = await apiGetAccountAssets(chain, address);
			await this.setStateAsync({ fetching: false, address, assets });
		} catch (error) {
			console.error(error);
			await this.setStateAsync({ fetching: false });
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
					/* this.setState((prevState) => {
						return {
							pendingSubmissions: prevState.pendingSubmissions.map((v, i) => {
								if (index === i) {
									return err;
								}
								return v;
							}),
						};
					});

					console.error(`Error submitting transaction at index ${index}:`, err); */
					console.error(`Error submitting transaction at index`);
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
		const applications = await this.checkOptin();
		if (applications === null) {
			// open Modal and prompt to optin, if not already
			this.toggleModal();

			this.setState({ pendingRequest: true, showModal: true });

			return;
		}
		for (let i = 0; i < applications.length; i++) {
			if (applications[i]['id'] === APP_ID && !applications[i]['deleted']) {
				return;
			}
			//console.log('Opt in...');
			// open Modal and prompt to optin, if not already
			this.toggleModal();

			this.setState({ pendingRequest: true, showModal: true });
		}

		//await testNetClientalgod.accountApplicationInformation(address,index).do()
	};
	public connectToMyAlgo = async (accounts: any) => {
		try {
			const address: string = accounts[0]['address'];
			const { chain } = this.state;

			this.setState({
				connected: true,
				accounts,
				address,
			});

			try {
				// get account balances
				const assets = await apiGetAccountAssets(chain, address);
				await this.setStateAsync({ fetching: false, address, assets });
			} catch (error) {
				console.error(error);
				await this.setStateAsync({ fetching: false });
			}
		} catch (err) {
			console.error(err);
			await this.setStateAsync({ ...INITIAL_STATE });
		}
	};
	public returnWallet = async (data: any) => {
		if (!!data) {
			try {
				console.log(data.connector.check());
				const accounts = await data.connector.connect();
				const connector = data.connector.provider;
				console.log(connector);

				const a = data.connector;
				console.log(a);
				console.log(accounts);

				if (a['provider']['protocol'] === 'wc') {
					// subscribe to events, if walletconnect
					//console.log(wprovider);
					await this.walletConnectInit();
				} else if (a['provider']['url']) {
					const onClearResponse = (): void => {
						this.setState({
							connected: false,
							accounts: [],
							address: '',
						});
					};

					try {
						await this.setStateAsync({
							...INITIAL_STATE,
							mconnector: data.connector,
						});
						await this.connectToMyAlgo(accounts);
					} catch (err) {
						console.error(err);
					}
				}
			} catch (error) {
				console.error(error);
				toast.error(`Window not loaded`, {
					position: 'top-left',
					autoClose: 4000,
					hideProgressBar: false,
					closeOnClick: true,
					pauseOnHover: true,
					draggable: true,
				});
			}
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
			wc,
			mconnector,
		} = this.state;

		return (
			<div>
				<Head>
					<title>DeFi4 Dapp</title>
					<meta name='name' content='Defi4 NFT' />
					<meta name='description' content='Connect to Defi4 dapp' />
					<link rel='icon' href='/favicon.ico' />
				</Head>

				<div>
					<Header
						connected={connected}
						address={address}
						killsession={this.killsession}
						chain={chain}
						chainupdate={this.chainupdate}
						wc={wc}
						clearsession={this.clearsession}
					/>
					<header className='flex w-full p-5 justify-between text-sm text-gray-500'>
						{!address && !assets.length ? (
							<>
								<div className='flex space-x-4 items-center'>
									<p className='link'>About</p>
								</div>
								<div className='flex space-x-4 items-center'>
									<this.DynamicComponentWithNoSSR
										returnWallet={this.returnWallet}
										wallets={['myalgowallet', 'walletconnect']}
									/>
								</div>
							</>
						) : (
							<></>
						)}
					</header>
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
						{/* Body */}
						{!address && !assets.length ? (
							<>
								<FrontPage />
								<section className='relative'>
									<div className=' text-white min-h-screen overflow-hidden'>
										<div className='inset-y-0 left-0 bg-gradient-to-r from-black px-8 py-16 w-screen -z-10'>
											<div className=' max-w-xl grid grid-cols-1 gap-4'>
												<div className='w-12'>
													{/* <ReactLogo className="fill-white" /> */}
												</div>
												<h2 className='text-xl uppercase font-bold'>
													DeFi-4 NFT
												</h2>
												<h1 className='text-6xl font-bold'>The DeFi-4 Team</h1>
												<p className='text-lg'>
													Liquidity and trade volume are two of the most
													pressing issues in the NFT industry right now. To
													remedy this difficulty, the NFT market needs DeFi. The
													DeFi-4 NFT team has been working hard, with the firm
													belief that this will facilitate mass adoption of NFTs
												</p>
												<div className='bg-gradient-to-r from-pink-600 to-orange-600 py-3 px-6 text-lg rounded-md w-48 right-0'>
													<this.DynamicComponentWithNoSSR
														returnWallet={this.returnWallet}
														wallets={['myalgowallet', 'walletconnect']}
													/>
													Try the Demo
												</div>
											</div>
										</div>
									</div>
								</section>
							</>
						) : (
							<>
								<Body
									assets={assets}
									connector={connector}
									address={address}
									chain={chain}
									wc={wc}
									mconnector={mconnector}
									//maccounts={maccounts}
								/>
							</>
						)}
					</div>
				</div>
				{wc ? (
					<Modal show={showModal} toggleModal={this.toggleModal}>
						{pendingRequest ? (
							<div className='w-full relative break-words'>
								<div className='mt-1 mb-0 font-bold text-xl'>
									{'OptIn To App'}
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
				) : mconnector ? (
					<AppOptin
						connector={connector}
						address={address}
						chain={chain}
						wc={wc}
						mconnector={mconnector}
					/>
				) : (
					<></>
				)}
			</div>
		);
	};
}

export default Home;
