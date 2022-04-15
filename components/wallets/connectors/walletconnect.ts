import WalletConnect from '@walletconnect/client';
import QRCodeModal from 'algorand-walletconnect-qrcode-modal';
import { IInternalEvent } from '@walletconnect/types';
import { formatJsonRpcRequest } from '@json-rpc-tools/utils';

const checkConnection = (connector: any) => {
	return connector.connected;
};

const ConnectToWalletConnect = (opts: any) => {
	const connector = new WalletConnect({
		bridge: 'https://bridge.walletconnect.org', // Required
		qrcodeModal: QRCodeModal,
	});

	return {
		provider: connector,
		connect: async () => {
			if (!connector.connected) {
				await connector.createSession();
			}
		},
		check: () => checkConnection(connector),
	};
};

export default ConnectToWalletConnect;
