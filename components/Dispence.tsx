{
	openTab === 4 && (
		<div className='flex w-full max-w-2xl items-center justify-evenly sm:w-48 sm:flex-wrap bg-white rounded-lg shadow-md p-6 fixed bottom-0 mt-4 hover:cursor-pointer group'>
			{JINAtoken && JINAtoken.amount > 5 ? (
				<>
					<div className='flex justify-between items-center'>
						<h1 className='uppercase text-sm sm:text-base tracking-wide'>
							Dispencer
						</h1>
						<div>
							<CheckCircleIcon className='h-4 sm:h-5 sm:mr-3 text-gray-500 cursor-pointer transition duration-100 transform hover:scale-125' />
							<span className='absolute w-auto p-2 m-2 min-w-max left-48 rounded-md text-white bg-gray-900 text-xs font-bold transition-all duration-100 scale-0 origin-left group-hover:scale-100'>
								You already have Jusd!
							</span>
						</div>
					</div>
					<div className='mb-0.5 font-semibold'>
						<span className='text-3xl sm:text-5xl mr-2'>10</span>
						<span className='text-xl sm:text-2xl'>JUSD</span>
					</div>
					<div className='content-center'>
						<div>
							{scenarios1.map(({ name, scenario1 }) => (
								<button
									className='relative px-6 py-1 sm:px-7 sm:py-2 rounded-md leading-none flex items-center bg-[#18393a] text-gray-100'
									key={name}
									onClick={(e) => {
										e.preventDefault();
										signTxnLogic(
											scenario1,
											connector as WalletConnect,
											address,
											chain,
											2
										);
									}}
								>
									{name}
								</button>
							))}
						</div>
					</div>
				</>
			) : (
				<>
					<div className='flex justify-between items-center'>
						<h1 className='uppercase text-sm sm:text-base tracking-wide'>
							Dispencer
						</h1>
					</div>
					<div className='mb-0.5 font-semibold'>
						<span className='text-3xl sm:text-5xl mr-2'>10</span>
						<span className='text-xl sm:text-2xl'>JUSD</span>
					</div>
					<div className='content-center'>
						<div>
							{scenarios1.map(({ name, scenario1 }) => (
								<button
									className='relative px-6 py-1 sm:px-7 sm:py-2 rounded-md leading-none flex items-center bg-[#2CB7BC] text-gray-100 opacity-75 hover:opacity-100'
									key={name}
									onClick={(e) => {
										e.preventDefault();
										signTxnLogic(
											scenario1,
											connector as WalletConnect,
											address,
											chain,
											2
										);
									}}
								>
									{name}
								</button>
							))}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
{
	openTab === 1 && (
		<div className='flex w-full max-w-2xl items-center justify-evenly sm:w-48 sm:flex-wrap bg-white rounded-lg shadow-md p-6 fixed bottom-0 mt-4 hover:cursor-pointer group'>
			{/* {!fetching ? <AccountAssets assets={assets} /> : <div />} */}
			{LOFTYtoken && LOFTYtoken.amount > 3 ? (
				<>
					<div className='flex justify-between items-center'>
						<h1 className='uppercase text-sm sm:text-base tracking-wide'>
							Dispencer
						</h1>
						<div>
							<CheckCircleIcon className='h-4 sm:h-5 sm:mr-3 text-gray-500 cursor-pointer transition duration-100 transform hover:scale-125' />
							<span className='absolute w-auto p-2 m-2 min-w-max left-48 rounded-md text-white bg-gray-900 text-xs font-bold transition-all duration-100 scale-0 origin-left group-hover:scale-100'>
								You already have LFT-Jina!
							</span>
						</div>
					</div>
					<div className='mb-0.5 font-semibold'>
						<span className='text-3xl sm:text-5xl mr-2'>4</span>
						<span className='text-xl sm:text-2xl'>LFT-Jina</span>
					</div>
					<div className='content-center'>
						<div>
							{scenarios2.map(({ name, scenario1 }) => (
								<button
									className='relative px-6 py-1 sm:px-7 sm:py-2 rounded-md leading-none flex items-center bg-[#18393a] text-gray-100'
									key={name}
									onClick={(e) => {
										e.preventDefault();
										signTxnLogic(
											scenario1,
											connector as WalletConnect,
											address,
											chain,
											0
										);
										setSwitcher(0);
									}}
								>
									{name}
								</button>
							))}
						</div>
					</div>
				</>
			) : (
				<>
					<div className='flex justify-between items-center'>
						<h1 className='uppercase text-sm sm:text-base tracking-wide'>
							Dispencer
						</h1>
					</div>
					<div className='mb-0.5 font-semibold'>
						<span className='text-3xl sm:text-5xl mr-2'>4</span>
						<span className='text-xl sm:text-2xl'>LFT-Jina</span>
					</div>
					<div className='content-center'>
						<div>
							{scenarios2.map(({ name, scenario1 }) => (
								<button
									className='relative px-6 py-1 sm:px-7 sm:py-2 rounded-md leading-none flex items-center bg-[#2CB7BC] text-gray-100 opacity-75 hover:opacity-100'
									key={name}
									onClick={(e) => {
										e.preventDefault();
										signTxnLogic(
											scenario1,
											connector as WalletConnect,
											address,
											chain,
											0
										);
									}}
								>
									{name}
								</button>
							))}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
{
	openTab === 3 && (
		<div className='flex w-full max-w-2xl items-center justify-evenly sm:w-48 sm:flex-wrap bg-white rounded-lg shadow-md p-6 fixed bottom-0 mt-4 hover:cursor-pointer group'>
			<div className='flex justify-between items-center'>
				<h1 className='uppercase text-sm sm:text-base tracking-wide'>
					Dispencer
				</h1>
			</div>
			<div className='mb-0.5 font-semibold'>
				<span className='text-3xl sm:text-5xl mr-2'>100</span>
				<span className='text-xl sm:text-2xl'>USDC</span>
			</div>
			<div className='content-center'>
				<div>
					<a
						target='_blank'
						href='https://dispenser.testnet.aws.algodev.network/'
						rel='noopener noreferrer'
						onClick={() => {
							"document.getElementByName('account').value='PROAQSK6TQLWFIAGW3J7N7JBFXHL73S6IQXUXWQTBUVP56RGGE6YSGYBVA';";
						}}
						className='relative px-6 py-1 sm:px-7 sm:py-2 rounded-md leading-none flex items-center bg-[#2CB7BC] text-gray-100 opacity-75 hover:opacity-100'
					>
						Go
					</a>
				</div>
			</div>
		</div>
	);
}
