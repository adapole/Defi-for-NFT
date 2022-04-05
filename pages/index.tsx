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
						{!address && !assets.length ? <></> : <></>}
					</div>
				</div>
			</div>
		);
	};
}

export default Home;
