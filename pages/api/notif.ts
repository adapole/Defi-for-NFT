import type { NextApiRequest, NextApiResponse } from 'next';
import { createSub, updatePayment, updateTransfer } from '../../prisma/user';

interface SourceDestinationObj {
	type: string;
	id: string;
	address: string;
	chain: string;
}

interface AmountObj {
	amount: string;
	currency: string;
}

interface RiskEvaluationObj {
	decision: string;
	reason: string;
}

interface VerificationObj {
	avs: string;
	cvv: string;
}

interface CancelRefundObj {
	id: string;
	type: string;
	merchantId: string;
	merchantWalletId: string;
	source: SourceDestinationObj;
	description: string;
	amount: AmountObj;
	fees: AmountObj;
	status: string;
	originalPayment: {
		id: string;
		type: 'payment';
		status: string;
		createDate: string;
		updateDate: string;
	};
	reason: string;
	createDate: string;
	updateDate: string;
}

interface MetaDataObj {
	email: string;
	phoneNumber: string;
}

interface BillingDetailsObj {
	name: string;
	city: string;
	country: string;
	line1: string;
	line2: string;
	district: string;
	postalCode: string;
}

interface BankAddressObj {
	bankName: string;
	city: string;
	district: string;
	country: string;
}

interface CardObj {
	id: string;
	billingDetails: BillingDetailsObj;
	expMonth: string;
	expYear: string;
	network: string;
	last4: string;
	verification: VerificationObj;
	riskEvaluation: RiskEvaluationObj;
	metadata: MetaDataObj;
}

interface WireAccountObj {
	id: string;
	description: string;
	trackingRef: string;
	fingerprint: string;
	billingDetails: BillingDetailsObj;
	bankAddress: BankAddressObj;
	createDate: string;
	updateDate: string;
}

interface ACHAccountObj {
	id: string;
	status: string;
	accountNumber: string;
	routingNumber: string;
	fingerprint: string;
	billingDetails: BillingDetailsObj;
	bankAddress: BankAddressObj;
	errorCode: string;
	riskEvaluation: RiskEvaluationObj;
	createDate: string;
	updateDate: string;
}

interface WalletObj {
	walletId: string;
	entityId: string;
	type: string;
	description: string;
	balances: [AmountObj];
}

interface PaymentObj {
	id: string;
	type: string;
	merchantId: string;
	merchantWalletId: string;
	amount: AmountObj;
	source: SourceDestinationObj;
	description: string;
	status: string;
	verification: VerificationObj;
	cancel: CancelRefundObj;
	refund: CancelRefundObj;
	fees: AmountObj;
	trackingRef: string;
	errorCode: string;
	metadata: MetaDataObj;
	riskEvaluation: RiskEvaluationObj;
	createDate: string;
	updateDate: string;
}

interface TransferObj {
	id: string;
	source: SourceDestinationObj;
	destination: SourceDestinationObj;
	amount: AmountObj;
	transactionHash: string;
	status: string;
	riskEvaluation: RiskEvaluationObj;
	createDate: string;
}

interface NotificationObj {
	clientId: string;
	notificationType: string;
	payment: PaymentObj | null;
	transfer: TransferObj | null;
	card: CardObj | null;
	ach: ACHAccountObj | null;
	wire: WireAccountObj | null;
	version: number | null;
	customAttributes: { clientId: string | null } | null;
}

export default async function handle(
	req: NextApiRequest,
	res: NextApiResponse
) {
	let notification = req.body;
	if (req.method !== 'POST') {
		return res.status(405).json({ message: 'Method not allowed' });
	}
	/* console.log(req);
  console.log(jsonString);
	return res.status(200).json(req); */
	try {
		const typ = JSON.parse(notification);
		const NotifObj: any = async () => {
			const notif = JSON.parse(JSON.parse(notification).Message);

			console.log(notif);
			switch (notif.notificationType) {
				case 'transfers':
					console.log(notif.transfer.status);
					//const tstatus = await updateTransfer(notif.transfer.id,notif.transfer.status);
					return res.json({ message: notif.transfer.status });
				case 'payments':
					console.log(notif.payment.status);
					const paystatus = await updatePayment(
						notif.payment.id,
						notif.payment.status
					);
					return res.json({ message: paystatus });
				case 'cards':
					console.log(notif.card.verification);
					return res.json({ message: notif.card.verification });
				case 'wire':
					console.log(notif.wire.trackingRef);
					return res.json({ message: notif.wire.trackingRef });
				case 'ach':
					console.log(notif.ach.status);
					return res.json({ message: notif.ach.status });
				default:
					console.log(notif.notificationType);
					return res.json({ message: notif.notificationType });
			}
		};
		switch (typ.Type) {
			case 'SubscriptionConfirmation':
				// run add to database
				const SubscribeURL: string = typ.SubscribeURL;
				console.log(SubscribeURL);
				const Subscription = await createSub(SubscribeURL as string);
				return res.json(Subscription);
			//return res.json({ message: typ.SubscribeURL });
			case 'Notification':
				console.log(typ.MessageId);
				// run function NotifObj
				const data = await NotifObj();
				return data; //res.json({ message: typ.SubscribeURL });
		}
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: 'error.message' });
	}
}
