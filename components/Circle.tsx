import React, { useReducer, useState } from 'react';
import {
	Box,
	Button,
	Card,
	CardContent,
	CircularProgress,
	Grid,
	Step,
	StepLabel,
	Stepper,
	Typography,
	Checkbox,
} from '@mui/material';
import {
	Formik,
	Form,
	Field,
	FormikConfig,
	FormikValues,
	useFormik,
} from 'formik';
import { CheckboxWithLabel, TextField } from 'formik-mui';
import { boolean, mixed, number, object, string } from 'yup';
import { CardDetails, encryptCard } from '../lib/helpers/encryptCard';
import CWalletList from './CWalletList';
import { addressContext } from '../lib/helpers/addressContext';
import CCardList from './CCardList';
import Select from 'react-select';
import Modal from './Modal';

type Props = {
	address: string;
};
interface Expiry {
	expMonth: number;
	expYear: number;
}
interface CardCreate {
	cardNumber: string;
	cardCVV: string;
	expMonth: number;
	expYear: number;
	billingDetails: BillingAddress;
}
interface BillingAddress {
	name: string;
	city: string;
	country: string;
	line1: string;
	postalCode: string;
	district: string;
}
interface PaymentDetail {
	amount: string;
	cvv: string;
}

const sleep = (time: number | undefined) =>
	new Promise((acc) => setTimeout(acc, time));

export default function Circle({ address }: Props) {
	const [showModal, setShowModal] = useState(false);
	const [result, setResult] = useState(false);
	const [pendingRequest, setPendingRequest] = useState(false);
	const [pendingSubmissions, setPendingSubmissions] = useState([]);
	const [isWalletAdd, setIsWalletAdd] = useState(true);
	const [changeAddress, setChangeAddress] = useState(true);

	const [description, setDescription] = useState('');
	const [walletId, setWalletId] = useState('');
	const [cardId, setCardId] = useState('');
	const [cardDetails, setCardDetails] = useState<CardDetails>({
		number: '4007400000000007',
		cvv: '123',
	});
	const [expiry, setExpiry] = useState<Expiry>({ expMonth: 1, expYear: 2025 });

	const walletCreate = async (name: string, algoaddress: string) => {
		/* let name = description;
		if (description === '') {
			setDescription('wallet');
			name = 'wallet';
		} */
		const response = await fetch('/api/cwallet', {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				description: name,
				address: algoaddress,
			}),
		});
		const data = await response.json();
		console.log(data);
		MessageSuccess();
	};

	const createCard = async (values: CardCreate) => {
		//const enD = await encryptCard(cardDetails);
		const enD = await encryptCard({
			number: values.cardNumber,
			cvv: values.cardCVV,
		});
		console.log(enD);
		const encryptedData = enD.encryptedData;
		const sessionId = 'DE6FA86F60BB47B379307F851E238617';
		const expMonth = values.expMonth;
		const expYear = values.expYear;
		/* console.log(expMonth);
		console.log(expYear);
		console.log(sessionId); */
		const response = await fetch('/api/ccard', {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				address,
				expYear,
				expMonth,
				sessionId,
				encryptedData,
			}),
		});
		const data = await response.json();
		console.log(data);
		MessageSuccess();
	};
	const createPayment = async (values: PaymentDetail) => {
		const enD = await encryptCard({ cvv: values.cvv });
		console.log(enD);
		const encryptedData = enD.encryptedData;
		const sessionId = 'DE6FA86F60BB47B379307F851E238617';
		const amount = values.amount;

		const response = await fetch('/api/cpay', {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				address,
				walletId,
				cardId,
				amount,
				encryptedData,
				sessionId,
			}),
		});
		const data = await response.json();
		console.log(data);
	};

	const validate = (values: any) => {
		const errors = {
			walletid: '',
		};
		if (!values.walletid) {
			//values.token.length < 5
			errors.walletid = 'Required';
		}
		return errors;
	};
	const formik = useFormik({
		initialValues: {
			walletid: '',
		},
		//validate,
		onSubmit: (value: any) => {
			console.log('Submitting');
			console.log(value);
		},
		//validate,
	});

	const toggleModal = () => {
		setShowModal(!showModal);
		setPendingSubmissions([]);
	};
	const openModal = () => {
		toggleModal();
		setPendingRequest(true);
	};

	const MessageSuccess = () => {
		setResult(true);
		setPendingRequest(false);
	};
	const toggleChange = () => {
		setChangeAddress(!changeAddress);
	};
	return (
		<addressContext.Provider
			value={{
				algoaddress: address,
				setwalletid: setWalletId,
				cwalletid: walletId,
				setcardid: setCardId,
				ccardid: cardId,
			}}
		>
			<Card>
				<CardContent>
					<FormikStepper
						initialValues={{
							cvv: '',
							amount: 0,
						}}
						onSubmit={async (values) => {
							await createPayment({
								amount: values.amount.toString(),
								cvv: values.cvv,
							});
							await sleep(1000);
							console.log('values', values);
						}}
					>
						<FormikStep label='Circle Wallet'>
							<Box paddingBottom={2}>
								<CWalletList />
							</Box>
							<Box paddingBottom={2} justifyContent='right'>
								<div className='right-1/2 left-1/2'>
									<Button
										variant='contained'
										color='primary'
										onClick={(e) => {
											e.preventDefault();
											setIsWalletAdd(true);
											openModal();
										}}
									>
										Add Wallet
									</Button>
								</div>
							</Box>
						</FormikStep>
						<FormikStep label='Account Cards'>
							<Box paddingBottom={2}>
								<CCardList />
								<Button
									variant='contained'
									color='primary'
									onClick={(e) => {
										e.preventDefault();
										setIsWalletAdd(false);
										openModal();
									}}
								>
									Add Card
								</Button>
							</Box>
						</FormikStep>
						<FormikStep
							label='Make Payment'
							validationSchema={object({
								amount: number()
									.required()
									.max(5, 'Because this is a test, use small value')
									.min(0, 'should be postive'),
								cvv: string().min(3, 'Too Short!').required('Required'),
							})}
						>
							<Box paddingBottom={2} paddingTop={2}>
								<Field
									fullWidth
									name='amount'
									type='number'
									component={TextField}
									label='Amount'
								/>
							</Box>
							<Box paddingBottom={2}>
								<Field
									name='cvv'
									type='password'
									component={TextField}
									label='CVV'
								/>
							</Box>
						</FormikStep>
					</FormikStepper>
				</CardContent>
				{walletId} {cardId}
				<>
					{/* 
                <div>
					{walletId} {cardId}
					Circle wallet create
					<input
						className='ml-4'
						type='text'
						placeholder='wallet'
						value={description}
						onChange={(e) => {
							e.preventDefault();
							setDescription(e.target.value);
						}}
					/>
					 <button className='btn ml-1' onClick={walletCreate}>
						Create
					</button> 
					Card Details
					<input
						className='ml-4'
						type='text'
						placeholder='4007400000000007'
						value={cardDetails.number}
						onChange={(e) => {
							e.preventDefault();
							setCardDetails((prevState) => {
								return { ...prevState, number: e.target.value };
							});
						}}
					/>
					<input
						className='ml-4'
						type='text'
						placeholder='123'
						value={cardDetails.cvv}
						onChange={(e) => {
							e.preventDefault();
							setCardDetails((prevState) => {
								return { ...prevState, cvv: e.target.value };
							});
						}}
					/>
					<input
						className='ml-4'
						type='number'
						placeholder='expMonth'
						value={expiry.expMonth}
						onChange={(e) => {
							e.preventDefault();
							setExpiry((prevState) => {
								return { ...prevState, expMonth: Number(e.target.value) };
							});
						}}
					/>
					<input
						className='ml-4'
						type='number'
						placeholder='expYear'
						value={expiry.expYear}
						onChange={(e) => {
							e.preventDefault();
							setExpiry((prevState) => {
								return { ...prevState, expYear: Number(e.target.value) };
							});
						}}
					/>
					<button className='ml-2 btn' onClick={createCard}>
						Add Card
					</button>
					<addressContext.Provider
						value={{
							algoaddress: address,
							setwalletid: setWalletId,
							cwalletid: walletId,
							setcardid: setCardId,
							ccardid: cardId,
						}}
					>
						 address={address} 
						 <CWalletList />
					<CCardList /> 
					</addressContext.Provider>
				</div> */}
				</>
			</Card>
			<Modal show={showModal} toggleModal={toggleModal}>
				{pendingRequest ? (
					<div className='w-full relative break-words'>
						{/* Make the form here, check if Add wallet or Card */}
						{isWalletAdd ? (
							<>
								<div className='h-full min-h-2 flex flex-col justify-center items-center break-words'>
									<Formik1
										initialValues={{
											walletName: '',
											newAddress: address,
										}}
										onSubmit={async (values) => {
											await walletCreate(values.walletName, values.newAddress);
											await sleep(1000);
										}}
									>
										<FormikStep
											label='Set Algorand address'
											validationSchema={object({
												newAddress: string()
													.required()
													.min(58, 'Enter a valid algorand address')
													.max(58, 'Enter a valid algorand address'),
											})}
										>
											<Box paddingBottom={2} paddingTop={2}>
												<Field
													name='newAddress'
													disabled={changeAddress}
													component={TextField}
													label='Algorand address'
												/>
											</Box>
											<Box paddingBottom={2}>
												<Checkbox onChange={toggleChange} />
												<label
													htmlFor='Checkbox'
													className={` ${
														changeAddress ? 'text-gray-900' : 'text-gray-300'
													}`}
												>
													{'Change current address'}
												</label>
											</Box>
										</FormikStep>
										<FormikStep
											label='Circle Wallet create'
											validationSchema={object({
												walletName: string()
													.min(2, 'Too Short!')
													.max(20, 'Too Long!')
													.required('Required'),
											})}
										>
											<Box paddingBottom={2} paddingTop={2}>
												<Grid
													container
													justifyItems='center'
													alignItems='center'
												>
													<Grid item>
														<label
															htmlFor='walletName'
															className='text-gray-400'
														>
															{'Circle Wallet: '}
														</label>
													</Grid>
													<Grid item>
														<Field
															name='walletName'
															component={TextField}
															label='Name'
															size='small'
														/>
													</Grid>
												</Grid>
											</Box>
										</FormikStep>
									</Formik1>
								</div>
							</>
						) : (
							<>
								<div className='mt-1 mb-0.5 text-gray-400 font-bold text-xl'>
									{'Add a Card'}
								</div>
								<div className='h-full min-h-2 flex flex-col justify-center items-center break-words'>
									<Formik1
										initialValues={{
											cardNumber: '4007400000000007',
											cardCVV: '123',
											expMonth: 1,
											expYear: 2025,
											billingDetails: {
												name: 'Satoshi Nakamoto',
												city: 'Boston',
												country: 'US',
												line1: '100 Money Street',
												postalCode: '01234',
												district: 'MA',
											},
										}}
										onSubmit={async (values) => {
											const card: CardCreate = {
												cardNumber: values.cardNumber,
												cardCVV: values.cardCVV,
												expMonth: values.expMonth,
												expYear: values.expYear,
												billingDetails: values.billingDetails,
											};
											await createCard(card);
											await sleep(1000);
										}}
									>
										<FormikStep
											label='Card Details'
											validationSchema={object({
												cardNumber: string().required('Required'),
												cardCVV: string()
													.min(3, 'Too Short!')
													.required('Required'),
												expMonth: number()
													.min(1, 'Enter valid month')
													.max(12, 'Too Long!')
													.required('Required'),
												expYear: number().required('Required'),
											})}
										>
											<Box
												paddingBottom={2}
												paddingTop={2}
												sx={{
													display: 'flex',
													alignItems: 'center',
													'& > :not(style)': { m: 1 },
												}}
											>
												<Field
													name='cardNumber'
													component={TextField}
													label='Card Number'
													size='small'
													sx={{ width: '20ch' }}
												/>

												<Field
													name='cardCVV'
													type='password'
													component={TextField}
													label='CVV'
													size='small'
													sx={{ width: '10ch' }}
												/>
											</Box>
											<Box
												paddingBottom={2}
												sx={{
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
													'& .MuiTextField-root': { m: 1, width: '15ch' },
												}}
											>
												<Grid
													container
													justifyItems='center'
													alignItems='center'
												>
													<Grid item>
														<Field
															name='expMonth'
															type='number'
															component={TextField}
															label='expiry Month'
															size='small'
														/>
													</Grid>
													<Grid item>
														<Field
															name='expYear'
															type='number'
															component={TextField}
															label='expiry Year'
															size='small'
														/>
													</Grid>
												</Grid>
											</Box>
										</FormikStep>
										<FormikStep label='Billing address'>
											<Box
												paddingBottom={2}
												paddingTop={2}
												sx={{
													display: 'flex',
													alignItems: 'center',
													'& > :not(style)': { m: 1 },
												}}
											>
												<Field
													name='billingDetails.name'
													component={TextField}
													label='Name'
													size='small'
													sx={{ width: '25ch' }}
												/>
											</Box>
											<Box
												paddingBottom={2}
												sx={{
													display: 'flex',
													alignItems: 'center',
													'& > :not(style)': { m: 1 },
												}}
											>
												<Field
													name='billingDetails.city'
													component={TextField}
													label='City'
													size='small'
													sx={{ width: '10ch' }}
												/>

												<Field
													name='billingDetails.country'
													component={TextField}
													label='Country'
													size='small'
													sx={{ width: '15ch' }}
												/>
											</Box>
											<Box
												paddingBottom={2}
												sx={{
													display: 'flex',
													alignItems: 'center',
													'& > :not(style)': { m: 1 },
												}}
											>
												<Field
													name='billingDetails.line1'
													component={TextField}
													label='Line 1'
													size='small'
													sx={{ width: '25ch' }}
												/>
											</Box>
											<Box
												paddingBottom={2}
												sx={{
													display: 'flex',
													alignItems: 'center',
													'& > :not(style)': { m: 1 },
												}}
											>
												<Field
													name='billingDetails.postalCode'
													component={TextField}
													label='Postal Code'
													size='small'
													sx={{ width: '15ch' }}
												/>

												<Field
													name='billingDetails.district'
													component={TextField}
													label='District'
													size='small'
													sx={{ width: '10ch' }}
												/>
											</Box>
										</FormikStep>
									</Formik1>
								</div>
							</>
						)}
					</div>
				) : result ? (
					<div className='w-full relative break-words'>
						{isWalletAdd ? (
							<div className='mt-1 mb-0 font-bold text-xl'>
								{'🎉Circle wallet created🎉'}
							</div>
						) : (
							<div className='mt-1 mb-0 font-bold text-xl'>
								{'Your card has been successfully added.🎉'}
							</div>
						)}
						{/* Show the form result with <pre> */}
					</div>
				) : (
					<div className='w-full relative break-words'>
						<div className='mt-1 mb-0 font-bold text-xl'>
							{'❌Request Rejected, Try again'}
						</div>
					</div>
				)}
			</Modal>
		</addressContext.Provider>
	);
}
export const Formik1 = ({ children, ...props }: FormikConfig<FormikValues>) => {
	const childrenArray = React.Children.toArray(
		children
	) as React.ReactElement<FormikStepProps>[];
	const [step, setStep] = useState(0);
	const currentChild = childrenArray[step];
	const [completed, setCompleted] = useState(false);
	function isLastStep() {
		return step === childrenArray.length - 1;
	}
	return (
		<Formik
			{...props}
			validationSchema={currentChild.props.validationSchema}
			onSubmit={async (values, helpers) => {
				if (isLastStep()) {
					await props.onSubmit(values, helpers);
					setCompleted(true);
				} else {
					setStep((s) => s + 1);

					helpers.setTouched({});
				}
			}}
		>
			{({ isSubmitting }) => (
				<Form autoComplete='off'>
					<Stepper alternativeLabel activeStep={step}>
						{childrenArray.map((child, index) => (
							<Step
								key={child.props.label}
								completed={step > index || completed}
							>
								<StepLabel>{child.props.label}</StepLabel>
							</Step>
						))}
					</Stepper>

					{currentChild}
					<Grid container spacing={2}>
						{step > 0 ? (
							<Grid item>
								<Button
									disabled={isSubmitting}
									variant='contained'
									color='primary'
									onClick={(e) => {
										e.preventDefault();
										setStep((s) => s - 1);
									}}
								>
									Back
								</Button>
							</Grid>
						) : null}
						<Grid item>
							<Button
								startIcon={
									isSubmitting ? <CircularProgress size='1rem' /> : null
								}
								disabled={isSubmitting}
								variant='contained'
								color='primary'
								type='submit'
							>
								{isSubmitting ? 'Submitting' : isLastStep() ? 'Create' : 'Next'}
							</Button>
						</Grid>
					</Grid>
				</Form>
			)}
		</Formik>
	);
};

export interface FormikStepProps
	extends Pick<FormikConfig<FormikValues>, 'children' | 'validationSchema'> {
	label: string;
}

export function FormikStep({ children }: FormikStepProps) {
	return <>{children}</>;
}

export function FormikStepper({
	children,
	...props
}: FormikConfig<FormikValues>) {
	const childrenArray = React.Children.toArray(
		children
	) as React.ReactElement<FormikStepProps>[];
	const [step, setStep] = useState(0);
	const currentChild = childrenArray[step];
	const [completed, setCompleted] = useState(false);

	function isLastStep() {
		return step === childrenArray.length - 1;
	}

	return (
		<Formik
			{...props}
			validationSchema={currentChild.props.validationSchema}
			onSubmit={async (values, helpers) => {
				if (isLastStep()) {
					await props.onSubmit(values, helpers);
					setCompleted(true);
				} else {
					setStep((s) => s + 1);

					// the next line was not covered in the youtube video
					//
					// If you have multiple fields on the same step
					// we will see they show the validation error all at the same time after the first step!
					//
					// If you want to keep that behaviour, then, comment the next line :)
					// If you want the second/third/fourth/etc steps with the same behaviour
					//    as the first step regarding validation errors, then the next line is for you! =)
					//
					// In the example of the video, it doesn't make any difference, because we only
					//    have one field with validation in the second step :)
					helpers.setTouched({});
				}
			}}
		>
			{({ isSubmitting }) => (
				<Form autoComplete='off'>
					<Stepper alternativeLabel activeStep={step}>
						{childrenArray.map((child, index) => (
							<Step
								key={child.props.label}
								completed={step > index || completed}
							>
								<StepLabel>{child.props.label}</StepLabel>
							</Step>
						))}
					</Stepper>

					{currentChild}

					<Grid container spacing={2}>
						{step > 0 ? (
							<Grid item>
								<Button
									disabled={isSubmitting}
									variant='contained'
									color='primary'
									onClick={(e) => {
										e.preventDefault();
										setStep((s) => s - 1);
									}}
								>
									Back
								</Button>
							</Grid>
						) : null}
						<Grid item>
							<Button
								startIcon={
									isSubmitting ? <CircularProgress size='1rem' /> : null
								}
								disabled={isSubmitting}
								variant='contained'
								color='primary'
								type='submit'
							>
								{isSubmitting ? 'Submitting' : isLastStep() ? 'Pay' : 'Next'}
							</Button>
						</Grid>
					</Grid>
				</Form>
			)}
		</Formik>
	);
}
