import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import locationsRouter from './routes/locations';
import usersRouter from './routes/users';
import templatesRouter from './routes/shiftTemplates';
import agendaEventsRouter from './routes/agendaEvents';
import authRouter from './routes/auth';
import roleFunctionsRouter from './routes/roleFunctions';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

import denyWrites from './middleware/denyWrites';
app.use(denyWrites);

app.use('/api/auth', authRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/users', usersRouter);
app.use('/api/shift-templates', templatesRouter);
app.use('/api/agenda-events', agendaEventsRouter);
app.use('/api/role-functions', roleFunctionsRouter);

const PORT = process.env.PORT || 4000;
const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/cerimoniarios';

let cached: any = (global as any)._mongo;
if (!cached) {
  cached = (global as any)._mongo = { conn: null, promise: null };
}

async function connectMongo() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO).then(m => m.connection);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default app;

if (process.env.NODE_ENV !== 'serverless') {
  connectMongo().then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  }).catch(err => {
    console.error('Mongo connection error', err);
    process.exit(1);
  });
}
