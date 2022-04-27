import React from 'react';
import Circle from './Circle';
import {
	AppBar,
	Box,
	Container,
	CssBaseline,
	ThemeProvider,
	Toolbar,
	Typography,
} from '@mui/material';
import { theme } from './Theme';
type Props = {
	address: string;
};

export default function Fiat({ address }: Props) {
	return (
		<div className='flex'>
			<ThemeProvider theme={theme}>
				{/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
				<CssBaseline />
				<Container>
					<Box marginTop={10}>
						<Circle address={address} />
					</Box>
				</Container>
			</ThemeProvider>
		</div>
	);
}
