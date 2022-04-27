import prisma from './prisma';

// READ
export const getAllposts = async () => {
	const posts = await prisma.post.findMany({});
	return posts;
};

export const getPost = async (id: any) => {
	const post = await prisma.post.findUnique({
		where: { id },
	});
	return post;
};

// CREATE
export const createPost = async (title: string, body: string) => {
	const post = await prisma.post.create({
		data: {
			title,
			body,
		},
	});
	return post;
};

/* // UPDATE
export const updateUser = async (id, updateData) => {
  const user = await prisma.user.update({
    where: {
      id
    },
    data: {
      ...updateData
    }
  })
  return user
}

// DELETE
export const deleteUser = async id => {
  const user = await prisma.user.delete({
    where: {
      id
    }
  })
  return user
} */
