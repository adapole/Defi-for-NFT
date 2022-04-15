import React from 'react';
import Image from 'next/image';

export const WalletButton = (props: { info: any; onClick: any }) => {
	const { info, onClick } = props;
	return (
		<button
			onClick={onClick}
			className=' transition duration-300 ease-in-out transform hover:scale-105 bg-white  flex  flex-col  p-2  justify-center  items-center  rounded-md  shadow  hover:shadow-md  focus:outline-none'
		>
			<Image
				src={info.logo}
				alt='wallet-logo'
				width={80}
				height={80}
				className=' object-center  object-cover  rounded-full  h-20  w-20'
			/>
			<p className=' text-lg bottom-0 font-bold'>{info.name}</p>
		</button>
	);
};

export default WalletButton;
