import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes/index.js';
import { ApiError } from './utils/http.js';

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'JAKHIRA ERP API is healthy' });
  });

  app.use('/api', routes);

  app.use((req, _res, next) => {
    next(new ApiError(404, `Route ${req.originalUrl} not found`));
  });

  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        details: error.details,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  });

  return app;
};
