import type { IncomingMessage, ServerResponse } from 'node:http';
import { createWeatherMiddleware } from '../server/weatherMiddleware.js';

const apiKey = process.env.OPENWEATHER_API_KEY || '';
const middleware = createWeatherMiddleware({ apiKey });

export default function handler(req: IncomingMessage, res: ServerResponse) {
  middleware(req, res);
}
