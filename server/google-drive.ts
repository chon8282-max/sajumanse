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

  // 토큰 갱신 (refresh token이 있는 경우)
  if (user.refreshToken) {
    try {
      accessToken = await refreshAccessToken(user.id, user.refreshToken);
    } catch (error) {
      console.error("Failed to refresh token:", error);
      // 갱신 실패 시 기존 토큰으로 시도
    }
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

// Google Drive 백업 업로드
export async function uploadBackupToDrive(
  userId: string,
  fileName: string,
  fileContent: string
) {
  const drive = await getDriveClient(userId);

  const fileMetadata = {
    name: fileName,
    parents: ["appDataFolder"],
  };

  const media = {
    mimeType: "application/json",
    body: fileContent,
  };

  try {
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, name",
    });

    return response.data;
  } catch (error: any) {
    console.error("Error uploading to Google Drive:", error);
    
    // 401/403 에러는 인증 문제 (Google API는 error.response.status 또는 error.status에 HTTP 상태 코드 저장)
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
      spaces: "appDataFolder",
      fields: "files(id, name, modifiedTime)",
      orderBy: "modifiedTime desc",
      pageSize: 10,
    });

    return response.data.files || [];
  } catch (error: any) {
    console.error("Error listing from Google Drive:", error);
    
    // 401/403 에러는 인증 문제 (Google API는 error.response.status 또는 error.status에 HTTP 상태 코드 저장)
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
    
    // 401/403 에러는 인증 문제 (Google API는 error.response.status 또는 error.status에 HTTP 상태 코드 저장)
    const status = error.response?.status || error.status || error.code;
    if (status === 401 || status === 403) {
      throw new Error("AUTH_EXPIRED");
    }
    
    throw error;
  }
}
