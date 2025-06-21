import express from 'express';
import cors from 'cors';
import busRoutes from './src/routes/busRoutes.js'

const app = express();
app.use(cors());
app.use(express.json());

app.use('/', busRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));