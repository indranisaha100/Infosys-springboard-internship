
import { request } from "../../../shared/services/api";

export async function getManagerDashboard() {
  return request("/manager/dashboard", {
    method: "GET",
  });
}
