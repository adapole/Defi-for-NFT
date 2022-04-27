// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';

import { createPost, getAllposts, getPost } from '../../prisma/post';
import { addPayment, createUser } from '../../prisma/user';
// Fetch all posts (in /pages/api/posts.ts)
export default async function handle(
	req: NextApiRequest,
	res: NextApiResponse
) {
	try {
		switch (req.method) {
			case 'GET': {
				if (req.query.id) {
					// Get a single post if id is provided is the query
					// api/post?id=1
					const post = await getPost(req.query.id);
					return res.status(200).json(post);
				} else {
					// Otherwise, fetch all posts
					const posts = await getAllposts();
					return res.json(posts);
				}
			}
			case 'POST': {
				if (req.method !== 'POST') {
					return res.status(405).json({ message: 'Method not allowed' });
				}
				// Create a new post
				/* const { title, body } = req.body;
				const post = await createPost(title, body);
				return res.json(post); */
				const { algowallet, walletid, cardid } = req.body;
				const user = await createUser(algowallet, walletid);
				return res.status(200).json(user);
			}
			case 'PUT': {
				// Update an existing user
				const { algowallet, payments } = req.body;
				//const pay = await addPayment(algowallet, payments[0]);
				//return res.json(pay);
			}
			/* case 'DELETE': {
            // Delete an existing user
            const { id } = req.body
            const user = await deleteUser(id)
            return res.json(user)
          } */
			default:
				break;
		}
	} catch (error) {
		return res.status(500).json({ message: 'error.message' });
	}
	/* if (req.method !== 'POST') {
		return res.status(405).json({ message: 'Method not allowed' });
	}
	//const posts = await prisma.post.findMany();
	const postData = JSON.parse(req.body);

	const savedPost = await prisma.post.create({
		data: postData,
	});
	res.json(savedPost); */
}
