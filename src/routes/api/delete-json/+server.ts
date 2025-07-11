import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { unlink, access, constants } from 'fs/promises';
import { resolve, normalize, extname, relative } from 'path';
import { PUBLIC_ROOT_FOLDER_LOCATION } from '$env/static/public';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const requestData = await request.json();
    if (!requestData || typeof requestData !== 'object' || !requestData.targetPath) {
      return json({ success: false, message: 'Invalid request structure - path is required' }, { status: 400 });
    }

    const rootFolder = PUBLIC_ROOT_FOLDER_LOCATION;
    if (!rootFolder) {
      throw new Error('PUBLIC_ROOT_FOLDER_LOCATION is not set');
    }

    const targetPath = normalize(requestData.targetPath);
    const absoluteTargetPath = resolve(rootFolder, targetPath);

    // Ensure the file has a .json extension
    if (extname(absoluteTargetPath).toLowerCase() !== '.json') {
      return json({ success: false, message: 'File must have a .json extension' }, { status: 400 });
    }

    // Security check: ensure the resolved path is within the root folder
    const relativePath = relative(rootFolder, absoluteTargetPath);
    if (relativePath.startsWith('..') || relativePath.includes('..')) {
      return json({ success: false, message: 'Access denied: path outside root folder' }, { status: 403 });
    }

    // Check if the file exists
    try {
      await access(absoluteTargetPath, constants.F_OK);
    } catch (error) {
      return json({ success: false, message: 'File not found' }, { status: 404 });
    }

    // Check if the file is deletable (writable)
    try {
      await access(absoluteTargetPath, constants.W_OK);
    } catch (error) {
      return json({ success: false, message: 'File is not deletable (permission denied)' }, { status: 403 });
    }

    // Delete the file
    await unlink(absoluteTargetPath);

    return json({ 
      success: true, 
      message: 'JSON file deleted successfully',
      deletedPath: relativePath
    });

  } catch (error) {
    console.error('Error deleting JSON file:', error);
    return json({ success: false, message: 'Error deleting JSON file' }, { status: 500 });
  }
};