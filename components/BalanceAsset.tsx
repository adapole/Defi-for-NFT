import * as React from 'react';
import Image from 'next/image';
import ASAIcon from './ASAIcon';
import algo from '../public/algo.svg';
import { formatBigNumWithDecimals } from '../lib/helpers/utilities';
import { IAssetData } from '../lib/helpers/types';
import { USDC } from '../lib/helpers/constants';

const BalanceAsset = (props: { asset: IAssetData; bodyamount: string }) => {
	const { asset, bodyamount } = props;
	const nativeCurrencyIcon = asset.id === 0 ? algo : null;
	const USDCIcon = asset.id === USDC;
	const [items, setItems] = React.useState('');
	React.useEffect(() => {
		console.log('Asset: ' + asset.amount);
	}, []);
	return (
		<div
			className='flex w-full max-w-2xl items-center p-5 justify-evenly sm:max-w-4xl lg:max-w-5xl'
			{...props}
		>
			<div className='flex items-center space-x-1'>
				{!USDCIcon && !nativeCurrencyIcon ? (
					<ASAIcon assetID={asset.id} />
				) : (
					<></>
				)}
				{/* Algo Icon */}
				{nativeCurrencyIcon && (
					<Image
						className='h-10 rounded-full cursor-pointer transition duration-150 transform hover:scale-110'
						src='/algo.svg'
						alt='algo'
						width='40'
						height='40'
					/>
				)}
				{USDCIcon && <ASAIcon assetID={31566704} />}
				<div className='flex ml-2'>{asset.name}</div>
			</div>
			<div className='flex'>
				{bodyamount && (
					<>
						<div className='flex' key={items}>
							{`${bodyamount} ${asset.unitName || 'units'}`}
						</div>
					</>
				)}
				{!bodyamount && (
					<div className='flex' key={items}>
						{`${formatBigNumWithDecimals(
							BigInt(asset.amount),
							asset.decimals
						)} ${asset.unitName || 'units'}`}
					</div>
				)}
			</div>
		</div>
	);
};

export default BalanceAsset;
