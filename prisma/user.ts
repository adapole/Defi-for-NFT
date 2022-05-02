import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// READ
export const getAllWallet = async (algowallet: string) => {
	try {
		const data = await prisma.users.findUnique({
			where: { algowallet },
			select: {
				walletid: true,
			},
		});
		return data;
	} catch (error) {
		return {
			walletid: [`${error}`],
		};
	}
};
export const getAllCard = async (algowallet: string) => {
	try {
		const data = await prisma.users.findUnique({
			where: { algowallet },
			select: {
				cardid: true,
			},
		});
		return data;
	} catch (error) {
		return {
			cardid: [`${error}`],
		};
	}
};

export const getAllusers = async () => {
	const users = await prisma.users.findMany({});
	return users;
};

export const getUser = async (id: any) => {
	const user = await prisma.users.findUnique({
		where: { id },
	});
	return user;
};

// CREATE
export const createUser = async (algowallet: string, walletid: any) => {
	try {
		const users = await prisma.users.upsert({
			where: {
				algowallet,
			},
			update: {
				walletid: {
					push: walletid,
				},
			},
			create: {
				algowallet,
				walletid: {
					set: walletid,
				},
			},
			/* update: {
				walletid: {
					push: walletid[0],
				},
			},
			create: {
				algowallet,
				walletid,
			}, */
		});
		console.log(users);
		return users;
	} finally {
		console.log('Closing prisma');
		await disconnect();
	}
};
export const createSub = async (SubscribeURL: string) => {
	const Subscription = await prisma.subscription.create({
		data: {
			SubscribeURL,
		},
	});
	return Subscription;
};
export const updateTransfer = async (
	transactionid: string,
	transferstatus: string
) => {
	const findid = await prisma.users.findFirst({
		where: {
			payments: {
				some: {
					transactionid: {
						equals: transactionid,
					},
				},
			},
		},
		select: {
			payments: true,
		},
	});
	const paymenti = findid!.payments;

	const payment = await prisma.users.updateMany({
		where: {
			payments: {
				some: {
					transactionid: {
						equals: transactionid,
					},
				},
			},
		},
		data: {
			payments: [
				{
					paymentid: paymenti[0].paymentid,
					transferstatus: transferstatus,
				},
			],
		},
	});
	console.log(payment);
	return payment;
};
export const updatePayment = async (paymentid: string, status: string) => {
	/* const findid = await prisma.users.findFirst({
		where: {
			payments: {
				some: {
					paymentid: {
						equals: paymentid,
					},
				},
			},
		},
		select: {
			payments: true,
		},
	});
	//const id = findid!.id;
	const payments = findid!.payments;
	const data = {
		paymentid: payments[0].paymentid,
		status: status,
		transferstatus: payments[0].transferstatus,
		transactionid: payments[0].transactionid,
		walletid: payments[0].walletid,
	};
	payments.push(data); 
	
	payments: {set: [...findid!.payments, {
				paymentid,
				status}]}
				*/

	const payment = await prisma.users.updateMany({
		where: {
			payments: {
				some: {
					paymentid: {
						equals: paymentid,
					},
				},
			},
		},
		data: {
			payments: [
				{
					paymentid,
					status,
				},
			],
		},
	});
	console.log(payment);
	return payment;
};

// UPDATE
export const updateUser = async (id: any, updateData: any) => {
	const user = await prisma.users.update({
		where: {
			id,
		},
		data: {
			...updateData,
		},
	});
	return user;
};
export const addPayment = async (
	algowallet: string,
	updateData: string,
	walletId: string
) => {
	try {
		/* const user = await prisma.users.findUnique({
            where: {
                algowallet,
            },
        });
        const id = user!.id;
        const payments = user!.payments;
        const data = {
            paymentid: 'pay id',
            status: 'some stat',
            transferstatus: 'pending',
            transactionid: 'txId',
        };
        payments.push(data);   */
		const payment = await prisma.users.update({
			where: {
				algowallet,
			},
			data: {
				payments: {
					push: {
						paymentid: updateData,
						walletid: walletId,
					},
				},
			},
		});
		console.log(payment);
		return payment;
	} finally {
		console.log('Closing prisma');
		await disconnect();
	}
};
export const addWallet = async (algowallet: string, updateData: any) => {
	try {
		const wallet = await prisma.users.update({
			where: {
				algowallet,
			},
			data: {
				walletid: {
					push: updateData,
				},
			},
		});
		//console.log(wallet);
		return wallet;
	} finally {
		console.log('Closing prisma');
		await disconnect();
	}
};
export const addCard = async (algowallet: string, updateData: any) => {
	try {
		const card = await prisma.users.update({
			where: {
				algowallet,
			},
			data: {
				cardid: {
					push: updateData,
				},
			},
		});
		//console.log(card);
		return card;
	} finally {
		console.log('Closing prisma');
		await disconnect();
	}
};
const disconnect = async () => {
	await prisma.$disconnect();
};
