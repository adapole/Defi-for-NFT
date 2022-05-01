import React, { useContext, useState } from 'react';
import { addressContext } from '../lib/helpers/addressContext';

type Props = {};

export default function CChainAddress({}: Props) {
	const AddressContext = useContext(addressContext);
	const [chainAddresses, setChainAddresses] = useState([
		{ address: '', chain: '', name: '' },
	]);

	const getAddresses = async () => {
		const response = await fetch('/api/getchainaddress', {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				walletid: AddressContext.cwalletid,
			}),
		});
		const data = await response.json();
		console.log(data);
		return data;
	};
	const options = async () => {
		if (!AddressContext.cwalletid) return;
		const data = await getAddresses();

		setChainAddresses(data);
		return;
	};
	React.useEffect(() => {
		options();
	}, []);

	return (
		<div>
			{/* <SearchIcon
					onClick={options}
					className='h-5 sm:mr-3 text-gray-500 cursor-pointer transition duration-100 transform group-hover:scale-125'
				/> */}
			{!AddressContext.cwalletid ? (
				<span className='absolute w-auto p-2 m-2 min-w-max left-48 rounded-md text-white bg-gray-900 text-xs font-bold transition-all duration-100 scale-100 origin-left hover:scale-110'>
					You should select a wallet first
				</span>
			) : null}

			<div className='mt-2'>
				<p className='mt-1 mb-1 uppercase pl-2'>{chainAddresses[0].name}</p>
				{React.Children.toArray(
					chainAddresses.map((item, index) => {
						return (
							<div key={index}>
								{item.address ? (
									<>
										{item.chain} - {item.address}
									</>
								) : null}
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}
