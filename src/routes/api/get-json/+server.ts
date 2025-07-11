import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile } from 'fs/promises';
import { join, resolve, normalize } from 'path';
import { PUBLIC_ROOT_FOLDER_LOCATION } from '$env/static/public';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const filePath = url.searchParams.get('filename');
    if (!filePath) {
      return json({ 
        success: false, 
        message: 'No file path provided' 
      }, { status: 400 });
    }

    const rootFolder = PUBLIC_ROOT_FOLDER_LOCATION;
    if (!rootFolder) {
      throw new Error('PUBLIC_ROOT_FOLDER_LOCATION is not set');
    }

    // Sanitize the path and prevent directory traversal
    const sanitizedPath = normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = resolve(rootFolder, sanitizedPath);

    // Additional security check to ensure we're still within the root folder
    if (!fullPath.startsWith(resolve(rootFolder))) {
      return json({ 
        success: false, 
        message: 'Invalid file path' 
      }, { status: 403 });
    }

    const fileContent = await readFile(fullPath, 'utf-8');
    const jsonData = JSON.parse(fileContent);

    return json({ 
      success: true,
      data: jsonData
    });

  } catch (error) {
    console.error('Error reading JSON file:', error);
    
    if (error.code === 'ENOENT') {
      return json({ 
        success: false, 
        message: 'File not found' 
      }, { status: 404 });
    }

    return json({ 
      success: false, 
      message: 'Error reading file' 
    }, { status: 500 });
  }
};