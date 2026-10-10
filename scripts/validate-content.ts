import process from 'node:process';
import { RESOURCE_GALLERY_CONFIG } from '../src/config/content/resourceGallery';
import {
	formatValidationReport,
	runContentValidation,
} from './lib/content-validation';

try {
	const result = runContentValidation(process.cwd(), { featuredImages: RESOURCE_GALLERY_CONFIG.featuredImages });
	process.stdout.write(formatValidationReport(result));

	if (result.errorCount > 0) {
		process.exitCode = 1;
	}
} catch (error) {
	const message = error instanceof Error ? error.stack ?? error.message : String(error);
	process.stderr.write(`内容检查无法完成：\n${message}\n`);
	process.exitCode = 1;
}
