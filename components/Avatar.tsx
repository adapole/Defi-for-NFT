const Avatar = (props: { url: any }) => {
	const { url } = props;
	return (
		<>
			<img
				loading='lazy'
				className='h-10 bg-indigo-500 shadow-lg shadow-indigo-500/50 rounded-full cursor-pointer transition duration-150 transform hover:scale-110'
				src={url}
				alt='profile pic'
			/>
		</>
	);
};

export default Avatar;
