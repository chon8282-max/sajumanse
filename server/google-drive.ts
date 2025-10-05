import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-drive',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Drive not connected');
  }
  return accessToken;
}

export async function getUncachableGoogleDriveClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function uploadBackupToDrive(fileName: string, fileContent: string, userAccessToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: userAccessToken
  });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const fileMetadata = {
    name: fileName,
    parents: ['appDataFolder']
  };

  const media = {
    mimeType: 'application/json',
    body: fileContent
  };

  try {
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name'
    });

    return response.data;
  } catch (error: any) {
    console.error('Error uploading to Google Drive:', error);
    const status = Number(error.response?.status ?? error.status ?? error.code);
    if (status === 401 || status === 403 || error.code === '401' || error.code === '403') {
      const authError: any = new Error('Google Drive authentication failed');
      authError.authError = true;
      authError.status = status || 401;
      throw authError;
    }
    throw error;
  }
}

export async function listBackupsFromDrive(userAccessToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: userAccessToken
  });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    const response = await drive.files.list({
      spaces: 'appDataFolder',
      fields: 'files(id, name, modifiedTime)',
      orderBy: 'modifiedTime desc',
      pageSize: 10
    });

    return response.data.files || [];
  } catch (error: any) {
    console.error('Error listing from Google Drive:', error);
    const status = Number(error.response?.status ?? error.status ?? error.code);
    if (status === 401 || status === 403 || error.code === '401' || error.code === '403') {
      const authError: any = new Error('Google Drive authentication failed');
      authError.authError = true;
      authError.status = status || 401;
      throw authError;
    }
    throw error;
  }
}

export async function downloadBackupFromDrive(fileId: string, userAccessToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: userAccessToken
  });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    const response = await drive.files.get({
      fileId: fileId,
      alt: 'media'
    }, { responseType: 'text' });

    return response.data;
  } catch (error: any) {
    console.error('Error downloading from Google Drive:', error);
    const status = Number(error.response?.status ?? error.status ?? error.code);
    if (status === 401 || status === 403 || error.code === '401' || error.code === '403') {
      const authError: any = new Error('Google Drive authentication failed');
      authError.authError = true;
      authError.status = status || 401;
      throw authError;
    }
    throw error;
  }
}
