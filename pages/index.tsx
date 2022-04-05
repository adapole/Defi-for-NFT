import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';

const Home: NextPage = () => {
	return (
		<div>
			<Head>
				<title>Next App</title>
				<meta name='description' content='Connect to next app' />
				<link rel='icon' href='/favicon.ico' />
			</Head>

			<h1 className='text-3xl font-bold underline'>Start Page!</h1>
		</div>
	);
};

export default Home;
