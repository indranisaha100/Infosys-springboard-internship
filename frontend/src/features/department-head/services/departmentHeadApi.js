import { request } from "../../../shared/services/api";

export function getDepartmentHeadDashboard() {
  return request("/department-head/dashboard", {
    method: "GET",
  });
}