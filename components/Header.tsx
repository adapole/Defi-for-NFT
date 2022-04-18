import { ChainType } from '../lib/helpers/api';
import { ellipseAddress } from '../lib/helpers/utilities';
import * as PropTypes from 'prop-types';
import * as React from 'react';
import styled from 'styled-components';
import Avatar from './Avatar';

const SHeader = styled.div`
	display: flex;
	width: 100%;
	justify-content: space-between;
	font-size: 14px; /* 0.875rem */
	color: rgb(107 114 128);
	flex-direction: row;
`;

const S1ActiveAccount = styled.div`
	display: flex;
	align-items: center;
	margin-left: 16px; /* 1rem */
`;

const S1ActiveChain = styled.div`
	padding: 20px; /* 1.25rem */
`;

interface IHeaderStyle {
	connected: boolean;
}

const SAddress = styled.p`
	display: flex;
	flex-direction: row;
	color: rgb(107 114 128);
`;
const SSpan = styled.span`
	color: rgb(129 140 248);
	cursor: pointer;
`;
const SAvatar = styled.span`
	align-items: center;
	margin-left: 20px; /*  1.25rem */
	display: none;
	@media (min-width: 640px) {
		display: inline-flex;
	}

	padding-right: 4px; /* 0.25rem */
`;

const SDisconnect = styled.div`
	position: relative;
	padding-left: 28px;
	padding-right: 28px;
	padding-top: 8px;
	padding-bottom: 8px;
	border-radius: 0.375rem; /* 6px */
	line-height: 1;
	display: flex;
	align-items: center;
	background-color: rgb(214, 214, 218);
	cursor: pointer;
`;

const S2Disconnect = styled.div`
	position: absolute;
	top: -2px; /* 0.125rem */
	right: -2px;
	bottom: -2px;
	left: -2px;
	background: rgb(147, 51, 234);
	background: linear-gradient(
		90deg,
		rgba(147, 51, 234, 1) 0%,
		rgba(219, 39, 119, 1) 100%
	);
	border-radius: 6px; /* 0.375rem */
	filter: blur(8px);
	opacity: 0.6;
`;
const S1Disconnect = styled.div`
	position: relative;
	padding-right: 2px; /* 0.125rem */
	&:hover ${S2Disconnect} {
		transition-property: opacity;
		transition-duration: 600ms;
		opacity: 0.1;
	}
	&:hover ${SSpan} {
		transition-duration: 200ms;
		color: rgb(243 244 246);
	}
	&:hover ${SDisconnect} {
		background-color: rgb(44, 183, 188);
	}
`;

interface IHeaderProps {
	killsession: () => unknown;
	connected: boolean;
	wc: boolean;
	clearsession: () => unknown;
	address: string;
	chain: ChainType;
	chainupdate: (newChain: ChainType) => unknown;
}

function stringToChainType(s: string): ChainType {
	switch (s) {
		case ChainType.MainNet.toString():
			return ChainType.MainNet;
		case ChainType.TestNet.toString():
			return ChainType.TestNet;
		default:
			throw new Error(`Unknown chain selected: ${s}`);
	}
}

const Header = (props: IHeaderProps) => {
	const { connected, address, killsession, wc, clearsession } = props;
	return (
		<SHeader {...props}>
			{connected && (
				<div className='flex w-full justify-between text-sm text-gray-500'>
					<S1ActiveChain>
						<p>
							{`Connected to `}
							<select
								onChange={(event) =>
									props.chainupdate(stringToChainType(event.target.value))
								}
								value={props.chain}
							>
								<option value={ChainType.TestNet}>Algorand TestNet</option>
								<option value={ChainType.MainNet}>Algorand MainNet</option>
							</select>
						</p>
					</S1ActiveChain>
					<S1ActiveAccount>
						<SAddress>{ellipseAddress(address).slice(0, 9)}</SAddress>
						<S1Disconnect>
							<S2Disconnect />
							{wc ? (
								<SDisconnect onClick={killsession}>
									<SSpan>{'Disconnect'}</SSpan>
								</SDisconnect>
							) : (
								<SDisconnect onClick={clearsession}>
									<SSpan>{'Disconnect.'}</SSpan>
								</SDisconnect>
							)}
						</S1Disconnect>
						<SAvatar>
							<Avatar
								url={`https://avatars.dicebear.com/api/adventurer/${ellipseAddress(
									address
								).slice(0, 6)}.svg`}
							/>
						</SAvatar>
					</S1ActiveAccount>
				</div>
			)}
		</SHeader>
	);
};

Header.propTypes = {
	killsession: PropTypes.func.isRequired,
	address: PropTypes.string,
};

export default Header;
