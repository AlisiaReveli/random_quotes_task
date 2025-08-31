import { FastifyReply, FastifyRequest } from 'fastify'
import { CreateUserInput, LoginUserInput, TopUsersQuery } from './user.schema'
import bcrypt from 'bcrypt'
import prisma from '../../utils/prisma'

const SALT_ROUNDS = 10

export async function getUsers(req: FastifyRequest, reply: FastifyReply) {
	const users = await prisma.user.findMany({
		select: {
			name: true,
			id: true,
			email: true,
		},
	})

	return reply.code(200).send(users)
}

export async function createUser(
	req: FastifyRequest<{
		Body: CreateUserInput
	}>,
	reply: FastifyReply
) {
	const { password, email, name } = req.body

	const user = await prisma.user.findUnique({
		where: {
			email: email,
		},
	})
	if (user) {
		return reply.code(401).send({
			message: 'User already exists with this email',
		})
	}

	try {
		const hash = await bcrypt.hash(password, SALT_ROUNDS)
		const user = await prisma.user.create({
			data: {
				password: hash,
				email,
				name,
				right_guessed_authors: {},
			},
		})

		const { password: _, ...userWithoutPassword } = user
		return reply.code(201).send(userWithoutPassword)
	} catch (e) {
		return reply.code(500).send(e)
	}
}

export async function login(
	req: FastifyRequest<{
		Body: LoginUserInput
	}>,
	reply: FastifyReply
) {
	const { email, password } = req.body
	const user = await prisma.user.findUnique({ where: { email: email } })
	if(!user){
	return reply.code(401).send({
		message: 'This email is not registered',
	})
}
	const isMatch = user && (await bcrypt.compare(password, user.password))
	if (!user || !isMatch) {
		return reply.code(401).send({
			message: 'Invalid email or password',
		})
	}

	const payload = {
		id: user.id,
		email: user.email,
		name: user.name,
	}
	const token = req.jwt.sign(payload, { expiresIn: process.env.JWT_EXPIRATION })

	return reply.code(200).send({
		accessToken: token,
		user: {
			id: user.id,
			email: user.email,
			name: user.name,
		},
		message: 'Login successful'
	})
}

export async function getTopUsers(
	req: FastifyRequest<{ Querystring: TopUsersQuery }>,
	reply: FastifyReply
  ) {
	try {
	  const limit = req.query.limit || 10
	  
	  const topUsers = await prisma.user.findMany({
		select: {
		  id: true,
		  name: true,
		  email: true,
		  score: true,
		},
		orderBy: {
		  score: 'desc'
		},
		take: limit
	  })
  
	  const totalUsers = await prisma.user.count()
  
	  return reply.code(200).send({
		users: topUsers,
		total: totalUsers
	  })
  
	} catch (error: any) {
	  req.log.error('Failed to get top users:', error)
	  return reply.code(500).send({ 
		message: error.message || 'Internal server error' 
	  })
	}
  }
