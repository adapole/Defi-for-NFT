import MyAlgoConnect from '@randlabs/myalgo-connect';

const ConnectToMyAlgo = () => {
	const myAlgoWallet = new MyAlgoConnect({ disableLedgerNano: false });
	const settings = {
		shouldSelectOneAccount: true,
		openManager: false,
	};

	return {
		provider: myAlgoWallet,
		connect: async () => await myAlgoWallet.connect(settings),
		check: () => false,
	};
};

export default ConnectToMyAlgo;
