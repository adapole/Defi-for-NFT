import MyAlgoConnect from '@randlabs/myalgo-connect';

const ConnectToMyAlgo = () => {
	const myAlgoWallet = new MyAlgoConnect();

	return {
		provider: myAlgoWallet,
		connect: async () => await myAlgoWallet.connect(),
		check: () => false,
	};
};

export default ConnectToMyAlgo;
