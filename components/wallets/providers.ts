import MyAlgoWalletLogo from '../../public/myalgowallet.png';
import AlgoWalletLogo from '../../public/walletconnect.png';

export const MYALGOWALLET = {
	id: 'myalgowallet',
	name: 'MyAlgoWallet',
	logo: MyAlgoWalletLogo,
	type: 'qrcode',
};

export const WALLETCONNECT = {
	id: 'walletconnect',
	name: 'wallet-connect',
	logo: AlgoWalletLogo,
	type: 'qrcode',
	package: {
		required: [['infuraId', 'rpc']],
	},
};
