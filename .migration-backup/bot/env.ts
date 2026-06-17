import { loadEnvConfig } from '@next/env';
import path from 'path';

loadEnvConfig(path.join(process.cwd(), './'));
