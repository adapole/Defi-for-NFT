import * as React from 'react';
import * as PropTypes from 'prop-types';

//cookies.set('_ga', '.algoexplorer.io/', { secure: true, sameSite: 'none' });

const ASAIcon = (props: { assetID: number }) => {
	const src = `https://algoexplorer.io/images/assets/big/light/${props.assetID}.png`;

	// Set a cross-site cookie for third-party contexts
	// cookie-domain:.algoexplorer.io cookie-name:_ga cookie-path:/
	//document.cookie = 'cookie-domain=.algoexplorer.io; cookie-name=_ga; cookie-path=/; SameSite=None; Secure';
	return (
		<img
			loading='lazy'
			className='h-10 rounded-full cursor-pointer transition duration-150 transform hover:scale-110'
			src={src}
		/>
	);
};

ASAIcon.propTypes = {
	assetID: PropTypes.number,
	size: PropTypes.number,
};

ASAIcon.defaultProps = {
	assetID: 0,
	size: 20,
};

export default ASAIcon;
