import { google } from 'googleapis';
import { storage } from './storage';

// Google OAuth 토큰 갱신
async function refreshAccessToken(userId: string, refreshToken: string) {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error("Token refresh failed:", error);
    throw new Error("Failed to refresh access token");
  }

  const tokens = await tokenResponse.json();

  // DB에 새 토큰 저장
  await storage.updateUserTokens(userId, {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || refreshToken, // 새 refresh token이 없으면 기존 것 유지
  });

  return tokens.access_token;
}

// Google Drive 클라이언트 생성
export async function getDriveClient(userId: string) {
  const user = await storage.getUser(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.accessToken) {
    throw new Error("Google Drive not connected. Please login again.");
  }

  // 토큰이 만료되었을 수 있으므로 refresh token이 있으면 갱신 시도
  let accessToken = user.accessToken;

  console.log("DEBUG getDriveClient - user.refreshToken exists:", !!user.refreshToken);
  console.log("DEBUG getDriveClient - user.accessToken exists:", !!user.accessToken);

  if (user.refreshToken) {
    try {
      accessToken = await refreshAccessToken(user.id, user.refreshToken);
      console.log("DEBUG getDriveClient - token refresh succeeded");
    } catch (error: any) {
      console.error("Failed to refresh token - message:", error.message);
      // 갱신 실패 시 기존 토큰으로 시도
    }
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

// ===== 백업 폴더 ("지천명만세력 백업") 찾기 또는 생성 =====
const BACKUP_FOLDER_NAME = "지천명만세력 백업";

async function getOrCreateBackupFolder(drive: any): Promise<string> {
  // 기존 폴더 검색 (drive.file 권한이라 이 앱이 만든 것만 보임)
  const found = await drive.files.list({
    q: `name = '${BACKUP_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id)",
    pageSize: 1,
  });
  if (found.data.files && found.data.files.length > 0) {
    return found.data.files[0].id;
  }
  // 없으면 생성
  const created = await drive.files.create({
    requestBody: {
      name: BACKUP_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });
  return created.data.id;
}

// Google Drive 백업 업로드
export async function uploadBackupToDrive(
  userId: string,
  fileName: string,
  fileContent: string
) {
  const drive = await getDriveClient(userId);

  try {
    const folderId = await getOrCreateBackupFolder(drive);

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: "application/json",
      body: fileContent,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, name",
    });

    return response.data;
  } catch (error: any) {
    console.error("Error uploading to Google Drive - message:", error.message);
    console.error("Error uploading to Google Drive - status:", error.response?.status || error.status || error.code);
    console.error("Error uploading to Google Drive - data:", JSON.stringify(error.response?.data || {}));

    const status = error.response?.status || error.status || error.code;
    if (status === 401 || status === 403) {
      throw new Error("AUTH_EXPIRED");
    }

    throw error;
  }
}

// Google Drive 백업 목록 조회
export async function listBackupsFromDrive(userId: string) {
  const drive = await getDriveClient(userId);

  try {
    const response = await drive.files.list({
      q: "mimeType != 'application/vnd.google-apps.folder' and trashed = false",
      fields: "files(id, name, modifiedTime)",
      orderBy: "modifiedTime desc",
      pageSize: 10,
    });

    return response.data.files || [];
  } catch (error: any) {
    console.error("Error listing from Google Drive:", error);

    const status = error.response?.status || error.status || error.code;
    if (status === 401 || status === 403) {
      throw new Error("AUTH_EXPIRED");
    }

    throw error;
  }
}

// Google Drive 백업 다운로드
export async function downloadBackupFromDrive(userId: string, fileId: string) {
  const drive = await getDriveClient(userId);

  try {
    const response = await drive.files.get(
      {
        fileId: fileId,
        alt: "media",
      },
      { responseType: "text" }
    );

    return response.data;
  } catch (error: any) {
    console.error("Error downloading from Google Drive:", error);

    const status = error.response?.status || error.status || error.code;
    if (status === 401 || status === 403) {
      throw new Error("AUTH_EXPIRED");
    }

    throw error;
  }
}