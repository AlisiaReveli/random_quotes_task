import { FastifyReply, FastifyRequest } from 'fastify'
import { CreateUserInput, LoginUserInput, TopUsersQuery } from './user.schema'
import bcrypt from 'bcrypt'
import prisma from '../../utils/prisma'
import { userLog } from '../../utils/logger'
import { createResponse } from '../../utils/response'

const SALT_ROUNDS = 10

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
		return reply.code(401).send(createResponse.error('User already exists with this email', 401))
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
		userLog.info( { user: userWithoutPassword }, 'User created successfully')
		return reply.code(201).send(createResponse.success(userWithoutPassword, 'User created successfully'))
	} catch (e:any) {
		userLog.error('Failed to create user', e)
		return reply.code(500).send(createResponse.error('Failed to create user', 500))
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
		return reply.code(401).send(createResponse.error('This email is not registered', 401))
	}
	const isMatch = await bcrypt.compare(password, user.password)
	if (!isMatch) {
		return reply.code(401).send(createResponse.error('Invalid email or password', 401))
	}

	const payload = {
		id: user.id,
		email: user.email,
		name: user.name,
	}
	const token = req.jwt.sign(payload, { expiresIn: process.env.JWT_EXPIRATION })

	return reply.code(200).send(createResponse.success({
		accessToken: token,
		user: {
			id: user.id,
			email: user.email,
			name: user.name,
		}
	}, 'Login successful'))
}

export async function getTopUsers(
	req: FastifyRequest<{ Querystring: TopUsersQuery }>,
	reply: FastifyReply
  ) {
	try {
		if(req.query.limit && isNaN(Number(req.query.limit))){
			return reply.code(400).send(createResponse.error('Limit must be a number', 400))
		}
		const limit = Number(req.query.limit) || 10
	  
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
  
	  return reply.code(200).send(createResponse.success({
		users: topUsers,
		total: totalUsers
	  }, 'Top users retrieved successfully'))
  
	} catch (error: any) {
	  req.log.error('Failed to get top users:', error)
	  return reply.code(500).send(createResponse.error('Internal server error', 500, error.message))
	}
  }
