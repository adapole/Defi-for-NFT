import React, { createContext, useContext } from 'react';
import { useProvideWallet } from './useProvideWallet';

const provideContext = createContext<any>(null);

export function ProvideWallet(props: { children: any }) {
	const { children } = props;
	const value = useProvideWallet();
	return (
		<provideContext.Provider value={value}>{children}</provideContext.Provider>
	);
}

export function useWallet() {
	return useContext(provideContext);
}
