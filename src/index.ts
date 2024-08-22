import {
	error,
	json,
	Router,
	createCors,
} from 'itty-router'
import { mintQueue } from './fetch/mint_queue'
import { processQueue } from './queue/process'
import { MintFactory } from './durable_object/mint_factory'
import { image } from './fetch/image'
import { glyphs } from './fetch/glyphs'
import { flush } from './fetch/flush'
import { contractId } from './fetch/contract_id'

const { preflight, corsify } = createCors()

const router = Router()

router
	.all('*', preflight)
	.get('/mint/:hash', mintQueue)
	.post('/mint', mintQueue)
	.get('/glyphs', glyphs)
	.get('/image/:hash', image)
	.delete('/:id', flush)
	.get('/contract-id/:signer', contractId)
	.all('*', () => error(404))

const handler = {
	fetch: (req: Request, ...args: any[]) =>
		router
			.handle(req, ...args)
			.then(json)
			.catch((err: any) => {
				console.error(err)
				return error(err)
			})
			.then(corsify),
	queue: processQueue,
}

export {
	MintFactory,
	handler as default
}