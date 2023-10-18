import { Buffer } from 'node:buffer';

globalThis.Buffer = Buffer;

import {
	error,
	json,
	Router,
	createCors,
} from 'itty-router'
import { mintQueue } from './fetch/mint_queue';
import { processQueue } from './queue/process_queue';
import { MintFactory } from './durable_object/mint_factory';
import { ChannelAccount } from './durable_object/channel_account';
import { debug } from './fetch/debug';
import { image } from './fetch/image';
import { glyphs } from './fetch/glyphs';
import { flush } from './fetch/flush';

const { preflight, corsify } = createCors()

const router = Router()

router
	.all('*', preflight)
	.get('/mint/:hash', mintQueue)
	.post('/mint', mintQueue)
	.get('/glyphs', glyphs)
	.get('/image/:hash', image)
	.get('/debug', debug)
	.delete('/:id', flush)
	.all('*', () => error(404))

const handler = {
	fetch: (req: Request, ...extra: any[]) =>
		router
			.handle(req, ...extra)
			.then(json)
			.catch((err) => {
				console.error(err)
				return error(err)
			})
			.then(corsify),
	queue: processQueue,
}

export {
	MintFactory,
	ChannelAccount,
	handler as default
}