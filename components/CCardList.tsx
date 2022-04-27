import React, { useContext, useEffect, useState } from 'react';
import { addressContext } from '../lib/helpers/addressContext';
import AsyncSelect from 'react-select/async';
import { ellipseAddress } from '../lib/helpers/utilities';

interface CircleCard {
	bin: string;
	network: string;
	id: string;
}
type Props = {};

interface iOption {
	label: string;
	value: string;
}

export default function CCardList({}: Props) {
	const AddressContext = useContext(addressContext);
	const [cardCircle, setCardCircle] = useState<CircleCard[]>([]);

	//const [cardNames, setCardNames] = useState<String[]>([]);

	const [fetching, setFetching] = useState(true);
	const [selectedCard, setSelectedCard] = useState<iOption>({
		value: '',
		label: '',
	});
	const [inputValue, setInputValue] = useState('');
	function setStateAsync(state: any) {
		return new Promise((resolve: any) => {
			setSelectedCard(state), resolve;
		});
	}
	const getCards = async () => {
		const response = await fetch('/api/getcardids', {
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
			const data = await getCards();
			if (data !== undefined) {
				console.log(data);

				// Extract data and populate AsyncSelect
				const tempArray: iOption[] = [];
				data.forEach((element: any) => {
					tempArray.push({
						label: `${element.bin} - ${element.network}`,
						value: `${element.id}`,
					});
				});
				callback(
					tempArray.filter((i) =>
						i.label.toLowerCase().includes(inputValue.toLowerCase())
					)
				);
				setCardCircle(data);
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
		AddressContext.setcardid(selectedCard.value);
		console.log('Using Effect');
	}, [selectedCard]);

	/* 
    const cardIds = async () => {
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
			setCardNames(data);
			setFetching(false);
		}
	};
    const getItems = useCallback(async () => {
		console.log('Card Callback running');
		return await cardIds();
	}, [cardNames]);

	useEffect(() => {
		getItems();
		console.log('Updating card');
	}, []); */

	return (
		<>
			{fetching ? (
				<p className='mt-2 text-gray-200'>
					No cards found for{' '}
					{ellipseAddress(AddressContext.algoaddress).slice(0, 6)}. Add a card
				</p>
			) : (
				<p className='mt-2'>
					{'Found '}
					{cardCircle.length}
					{' card'}
					{/* {cardCircle.map((item, index) => (
						<div key={index}>
							{item.bin}
							{'-'}
							{item.network}
						</div>
					))} */}
				</p>
			)}
			<AsyncSelect
				cacheOptions
				loadOptions={loadOptions}
				placeholder='Select card'
				defaultOptions
				onInputChange={handleInputChange}
				onChange={async (option) => {
					await setStateAsync(option as iOption);
				}}
				className='mb-4'
			/>
		</>
	);
}
