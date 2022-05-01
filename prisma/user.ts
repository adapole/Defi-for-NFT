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
