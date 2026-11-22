import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { allowedOrigins, env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { generalLimiter } from './middleware/rateLimiters.js';
import adminRouter from './routes/admin.routes.js';
import authRouter from './routes/auth.routes.js';
import bookingsRouter from './routes/bookings.routes.js';
import partnerRouter from './routes/partner.routes.js';
import paymentsRouter from './routes/payments.routes.js';
import propertiesRouter from './routes/properties.routes.js';

const app = express();

app.disable('x-powered-by');
// One proxy (the hosting platform) is trusted to set X-Forwarded-For.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
if (env.NODE_ENV === 'development') app.use(morgan('dev'));
app.use(generalLimiter);

// Razorpay signs the exact request bytes. Keep this before express.json() so a
// future webhook handler can verify the signature against the raw body (A3).
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentsRouter);

app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/partner', partnerRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/admin', adminRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
