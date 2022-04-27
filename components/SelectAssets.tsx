import * as React from 'react';
import { assetsContext } from '../lib/helpers/assetsContext';
import {
	apiGetAccountAssets,
	apiGetTxnParams,
	ChainType,
	testNetClientalgod,
	testNetClientindexer,
} from '../lib/helpers/api';
import { decodeUint64 } from 'algosdk';
import { create } from 'ipfs-http-client';
import MultipleValueTextInput from './MultipleValueTextInput';
const ipfs = create({
	host: 'ipfs.infura.io',
	port: 5001,
	protocol: 'https',
});

const SelectAssets = (props: { assetid: number }) => {
	const [assetName, setAssetName] = React.useState(null);
	const AssetsContext = React.useContext(assetsContext);

	const { assetid } = props;
	const borrowGetLogic = async (ipfsPath: string): Promise<Uint8Array> => {
		const chunks = [];
		for await (const chunk of ipfs.cat(ipfsPath)) {
			chunks.push(chunk);
		}
		console.log(chunks);
		//setBorrowLogicSig(chunks[0]);
		return chunks[0];
	};
	async function name() {
		const assetInfo = await testNetClientindexer.lookupAssetByID(assetid).do();
		//return assetInfo.asset.name
		console.log(assetInfo);
		const unitName = assetInfo.asset.params['unit-name'];
		setAssetName(unitName);
	}

	/**
	 * Returns range of bytes from A starting at S up to but not including S+L,
	 * If S or S+L is larger than the array length, throw error
	 * @param array Uint8array
	 * @param start starting point in array
	 * @param length length of substring
	 */
	function opExtractImpl(
		array: Uint8Array,
		start: number,
		length: number
	): Uint8Array {
		const end = start + length;
		if (start > array.length) {
			console.log('Start > array.length');
		}
		if (end > array.length) {
			console.log('end > array.length');
		}

		return array.slice(start, end);
	}

	function getBytes(str: string) {
		let intArray = str.split('').map(function (c) {
			return c.charCodeAt(0);
		});
		let byteArray = new Uint8Array(intArray.length);
		for (let i = 0; i < intArray.length; i++) byteArray[i] = intArray[i];
		return byteArray;
	}
	function asciiToUint8Array(str: string) {
		var chars = [];
		for (var i = 0; i < str.length; ++i) {
			chars.push(str.charCodeAt(i));
		}
		return new Uint8Array(chars);
	}
	function UInt64ToString(bytes: Uint8Array) {
		//const isNegative = isSigned && bytes.length > 0 && bytes[0] >= 0x80;
		const digits: any = [];
		bytes.forEach((byte, j) => {
			for (let i = 0; byte > 0 || i < digits.length; i++) {
				byte += (digits[i] || 0) * 0x100;
				digits[i] = byte % 10;
				byte = (byte - digits[i]) / 10;
			}
		});
		return digits.reverse().join('');
	}
	// convert bigint/number -> hex string
	function toHex(b: bigint | number): string {
		const hex = BigInt(b).toString(16);
		if (hex.length % 2) {
			return '0' + hex;
		} // add missing padding
		return hex;
	}
	// converts buffer/uint8array to hex string
	function buffToHex(u: Uint8Array | Buffer): string {
		const uint8Arr = Uint8Array.from(u);
		const hexArr: string[] = [];
		uint8Arr.forEach((i) => {
			hexArr.push(toHex(i));
		}); // each byte to hex
		return '0x' + hexArr.join('');
	}
	/**
	 * Parses unsigned big endian bytes (represented as Uint8array) back to bigint
	 * NOTE: This is different from decodeUint64, encodeUint64 as it is capable of
	 * handling bigint > 64 bit (8 bytes).
	 * @param bytes big endian bytes (buffer or Uint8array)
	 */
	function bigEndianBytesToBigInt(bytes: Uint8Array | Buffer): bigint {
		if (bytes.length === 0) {
			return BigInt(0);
		}
		return BigInt(buffToHex(bytes));
	}
	/**
	 * Parses bigint to big endian bytes (represeted as Uint8array)
	 * NOTE: This is different from decodeUint64, encodeUint64 as it is capable of
	 * handling bigint > 64 bit (8 bytes).
	 * @param b value in bigint to parse
	 */
	function bigintToBigEndianBytes(b: bigint): Uint8Array {
		const hex = toHex(b);

		// The byteLength will be half of the hex string length
		const len = hex.length / 2;
		const u8 = new Uint8Array(len);

		// And then we can iterate each element by one
		// and each hex segment by two
		let i = 0;
		let j = 0;
		while (i < len) {
			u8[i] = parseInt(hex.slice(j, j + 2), 16);
			i += 1;
			j += 2;
		}

		return u8;
	}
	React.useEffect(() => {
		//name();
	}, []);
	return (
		<div
			className='w-full -mt-2 px-5 py-2 items-center flex-grow max-w-md sm:max-w-xl lg:max-w-2xl'
			{...props}
		>
			<MultipleValueTextInput
				onItemAdded={() => {
					console.log(`Item added: `);
				}}
				onItemDeleted={() => console.log(`Item Deleted: `)}
				//label='Asset'
				name='item-input'
				placeholder='Allowed NFTs'
				values={[assetid.toString()]}
			/>
			{/* Component S - {AssetsContext.countState}
			<button
				onClick={(e) => {
					e.preventDefault();
					AssetsContext.countDispatch('increment');
				}}
			>
				increment
			</button> */}
		</div>
	);
};

export default SelectAssets;
