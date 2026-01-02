/**
 * @author DongDev
 * ! The source code is written by DongDev, please don't change the author's name everywhere. Thank you for using
 * ! Official source code: https://github.com/dongp06/AURABOT
 * ! If you do not download the source code from the above address, you are using an unknown version and at risk of having your account hacked
 *
 * English:
 * ! Please do not change the below code, it is very important for the project.
 * It is my motivation to maintain and develop the project for free.
 * ! If you change it, you will be banned forever
 * Thank you for using
 *
 * Vietnamese:
 * ! Vui lòng không thay đổi mã bên dưới, nó rất quan trọng đối với dự án.
 * Nó là động lực để tôi duy trì và phát triển dự án miễn phí.
 * ! Nếu thay đổi nó, bạn sẽ bị cấm vĩnh viễn
 * Cảm ơn bạn đã sử dụng
 */

import { spawn } from 'child_process';
import { logger } from './main/utils/logger';

function startProject(): void {
  const child = spawn('node', ['-r', 'ts-node/register', 'main/Aura.ts'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: process.env
  });

  child.on('close', (code) => {
    if (code === 2) {
      logger.info('🔄 Restarting Project...');
      startProject();
    }
  });

  child.on('error', (error) => {
    logger.error('❌ Lỗi khi spawn process:', error);
    setTimeout(() => {
      logger.info('🔄 Retrying...');
      startProject();
    }, 2000);
  });
}

startProject();
