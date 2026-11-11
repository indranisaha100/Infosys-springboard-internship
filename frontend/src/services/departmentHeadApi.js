import { request } from "./api";

export function getDepartmentHeadDashboard() {
  return request("/department-head/dashboard", {
    method: "GET",
  });
}