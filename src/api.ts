import axios from "axios";

const instance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  timeout: 1000,
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
