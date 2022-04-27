import React, { useContext, useEffect, useState } from 'react';
import { addressContext } from '../lib/helpers/addressContext';
import AsyncSelect from 'react-select/async';
import { ellipseAddress } from '../lib/helpers/utilities';

interface CircleWallet {
	walletid: string;
	name: string;
}
type Props = {
	//address: string;
};
interface iOption {
	label: string;
	value: string;
}

export default function CWalletList({}: Props) {
	const AddressContext = useContext(addressContext);
	const [walletCircle, setWalletCircle] = useState<CircleWallet[]>([]);
	const [fetching, setFetching] = useState(true);
	const [selectedWallet, setSelectedWallet] = useState<iOption>({
		value: '',
		label: '',
	});
	const [inputValue, setInputValue] = useState('');

	const getWallets = async () => {
		const response = await fetch('/api/getwalletids', {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				address: AddressContext.algoaddress,
			}),
		});
		const data = await response.json();
		return data;
	};
	const loadOptions = (
		inputValue: string,
		callback: (options: iOption[]) => void
	) => {
		setTimeout(async () => {
			// Fetch data
			const data = await getWallets();
			if (data !== undefined) {
				console.log(data);

				// Extract data and populate AsyncSelect
				const tempArray: iOption[] = [];
				if (data[0].walletid === 'error') {
					callback([]);
				}
				data.forEach((element: any) => {
					tempArray.push({
						label: `${element.name}`,
						value: `${element.walletid}`,
					});
				});
				callback(
					tempArray.filter((i) =>
						i.label.toLowerCase().includes(inputValue.toLowerCase())
					)
				);
				setWalletCircle(data);
				setFetching(false);
			}
		}, 1000);
	};
	const handleInputChange = (newValue: string) => {
		const inputValue = newValue.replace(/\W/g, '');
		setInputValue(inputValue);
		return inputValue;
	};
	useEffect(() => {
		AddressContext.setwalletid(selectedWallet.value);
		console.log('Using Effect');
	}, [selectedWallet]);
	/* const validate = (values: any) => {
        const errors: errors = {
            email: ''
        }
        if(!values.email){
            errors.email = 'Email is required'
        }
    }
    const formik = useFormik({
        initialValues: {
            email: 'test@test.com'
        },
        validate,
        onSubmit: value => {
            console.log(value)
        }
    }) */

	/* const walletIds = async () => {
		const response = await fetch('/api/getwalletids', {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				address: AddressContext.algoaddress,
			}),
		});
		const data = await response.json();
		if (data !== undefined) {
			console.log(data);
			setWalletCircle(data);
			// Extract data and populate to
			data.map((item: any) => {
				item.name;
			});
			options.push();
			setFetching(false);
		}
	};
	const getItems = useCallback(async () => {
		console.log('Wall Callback running');
		return await walletIds();
	}, [walletCircle]);

	useEffect(() => {
		getItems();
		console.log('Wall Updating');
	}, []); */
	//
	return (
		<>
			{/* Check if New user has db, if they have display wallets, if not display No wallets found */}

			{fetching ? (
				<p className='mt-2 text-gray-200'>
					No Wallets found for{' '}
					{ellipseAddress(AddressContext.algoaddress).slice(0, 6)}. Add a wallet
				</p>
			) : (
				<p className='mt-2'>
					{'You have '}
					{walletCircle.length}
					{' circle wallet'}
					{/* {walletCircle.map((item, index) => (
						<div key={index}>{item.name}</div>
					))} */}
				</p>
			)}
			<AsyncSelect
				cacheOptions
				loadOptions={loadOptions}
				placeholder='Select wallet'
				defaultOptions
				onInputChange={handleInputChange}
				onChange={async (option) => {
					setSelectedWallet(option as iOption);
				}}
				className='mb-4'
			/>
		</>
	);
}
