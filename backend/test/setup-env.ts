import 'dotenv/config';
import { randomBytes } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';

process.env.NODE_ENV = 'test'; // désactive les limites de débit pendant les tests
// Stockage et clé de chiffrement JETABLES : les tests n'écrivent jamais dans le vrai dossier de fichiers.
process.env.STORAGE_DIR = join(tmpdir(), `caphci-test-storage-${process.pid}`);
process.env.FILES_ENCRYPTION_KEY = randomBytes(32).toString('base64');
