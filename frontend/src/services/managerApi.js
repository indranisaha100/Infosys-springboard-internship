
import { request } from "./api";

export async function getManagerDashboard() {
  return request("/manager/dashboard", {
    method: "GET",
  });
}
