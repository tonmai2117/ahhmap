import type { IncomingMessage, ServerResponse } from 'node:http';
import { createWeatherTileMiddleware } from '../server/weatherTileMiddleware.js';

const apiKey = process.env.OPENWEATHER_API_KEY || '';
const middleware = createWeatherTileMiddleware({ apiKey });

export default function handler(req: IncomingMessage, res: ServerResponse) {
  middleware(req, res);
}
