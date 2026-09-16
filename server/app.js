import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import inquiryRoutes from './routes/inquiry.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { successResponse, errorResponse } from './utils/apiResponse.js';
import mongoose from 'mongoose';

const app = express();

// Security Middlewares
app.use(helmet());

// CORS Config
app.use(cors({
  origin: config.clientOrigin,
  methods: ['GET', 'POST', 'PATCH'],
  credentials: true
}));

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging
app.use(requestLogger);

// Health Endpoint
app.get('/api/v1/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return errorResponse(res, {
      code: 'DATABASE_DISCONNECTED',
      message: 'Database is not connected'
    }, 503);
  }

  return successResponse(res, {
    service: 'pocika-api',
    database: 'connected'
  });
});

// Routes
app.use('/api/v1/inquiries', inquiryRoutes);
app.use('/api/v1/upload', uploadRoutes);

// 404 Handler
app.use(notFound);

// Error Handler
app.use(errorHandler);

export default app;
