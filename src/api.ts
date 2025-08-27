import axios from "axios";

const instance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'x-api-key': 'H4oJvBoI6G2Q7fNDJzy8eaSxwG7qCgTacLbqYHR0'
  }
});

export interface LeaderboardEntry {
  username: string;
  score: number;
  created_at: string;
}

export async function getLeaderBoard(): Promise<LeaderboardEntry[]> {
  const response = await instance.get<LeaderboardEntry[]>("/api/leaderboard");
  return response.data;
}

export async function postScore(username: string, score: number) {
  await instance.post("/api/score", { username, score });
}

export async function startGameSession() {
  const response = await instance.post("/api/game/start");
  return response.data;
}
