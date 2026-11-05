import app from './app.js';
import { ENV } from './config/env.js';
import { testDbConnection } from './config/db.js';

const iniciarServidor = async (): Promise<void> => {
    try {
        await testDbConnection();
        app.listen(ENV.PORT, () => {
            console.log(`Servidor backend corriendo exitosamente en el puerto ${ENV.PORT}`);
        });
    } catch (error) {
        console.error('Error crítico al iniciar el servidor backend:', error);
        process.exit(1);
    }
};

iniciarServidor();