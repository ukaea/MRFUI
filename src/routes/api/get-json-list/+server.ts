import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readdir } from 'fs/promises';
import { join, resolve, normalize } from 'path';
import { PUBLIC_ROOT_FOLDER_LOCATION } from '$env/static/public';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const targetPath = url.searchParams.get('path');
    if (!targetPath) {
      return json({ 
        success: false, 
        message: 'No path provided' 
      }, { status: 400 });
    }

    const rootFolder = PUBLIC_ROOT_FOLDER_LOCATION;
    if (!rootFolder) {
      throw new Error('PUBLIC_ROOT_FOLDER_LOCATION is not set');
    }

    const sanitizedPath = normalize(targetPath).replace(/^(\.\.[\/\\])+/, '');
    const targetDirectory = resolve(rootFolder, sanitizedPath);

    if (!targetDirectory.startsWith(rootFolder)) {
      return json({ 
        success: false, 
        message: 'Invalid directory path' 
      }, { status: 403 });
    }

    const files = await readdir(targetDirectory);

    const jsonFiles = files.filter(file => file.endsWith('.json'));

    return json({ 
      success: true,
      path: sanitizedPath,
      files: jsonFiles
    });

  } catch (error) {
    console.error('Error reading directory:', error);
    
    if (error.code === 'ENOENT') {
      return json({ 
        success: false, 
        message: 'Directory not found' 
      }, { status: 404 });
    }

    return json({ 
      success: false, 
      message: 'Error reading directory' 
    }, { status: 500 });
  }
};