import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import { Modal } from './WModal';
import { ProvideWallet, useWallet } from '../lib/helpers/ProvideWallet';

/**
 * Primary UI component for user interaction
 */
const WalletSelector = ({ returnWallet, wallets = [] }) => {
	return (
		<div>
			<ProvideWallet>
				<SelectorContent returnWallet={returnWallet} validWallets={wallets} />
			</ProvideWallet>
		</div>
	);
};

const SelectorContent = ({ returnWallet, validWallets }) => {
	let [isOpen, setIsOpen] = useState(false);
	const { setValidWallets } = useWallet();

	useEffect(() => {
		setValidWallets(validWallets);
	}, [validWallets]);

	const closeModal = (walletInfo) => {
		setIsOpen(false);
		returnWallet(walletInfo);
	};

	const openModal = () => {
		setIsOpen(true);
	};

	return (
		<>
			<div className='relative group'>
				<div className='absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-md blur opacity-75 group-hover:opacity-100 transition duration-600 group-hover:duration-200 animate-tilt'></div>
				<button
					type='button'
					onClick={openModal}
					className='relative px-7 py-2 rounded-md leading-none flex items-center divide-x divide-gray-600 bg-black'
					//className=' px-4  py-2  text-sm  font-medium  text-white  bg-black  rounded-md  bg-opacity-100  hover:bg-opacity-75  focus:outline-none  focus-visible:ring-2  focus-visible:ring-white  focus-visible:ring-opacity-75'
				>
					<span className='pr-2 text-gray-100'>Connect wallet</span>
				</button>
			</div>
			<Modal isOpen={isOpen} closeModal={closeModal} />
		</>
	);
};

WalletSelector.propTypes = {
	returnWallet: PropTypes.func,
	wallets: PropTypes.array,
};
export default WalletSelector;
