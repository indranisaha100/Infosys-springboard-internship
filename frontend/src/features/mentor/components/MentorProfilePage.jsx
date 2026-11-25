import { useEffect, useState } from "react";
import { request } from "../../../shared/services/api";

export default function MentorProfilePage() {
  const [profile, setProfile] = useState(null);
  const [expertise, setExpertise] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    request("/mentor/profile")
      .then((result) => {
        if (!active) return;
        setProfile(result);
        setExpertise(result.expertise || "");
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Your profile could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await request("/mentor/profile", {
        method: "PUT",
        body: JSON.stringify({ expertise }),
      });
      setProfile(updated);
      setExpertise(updated.expertise || "");
      setSuccess("Your expertise was saved and is now visible in the HR mentor directory.");
    } catch (saveError) {
      setError(saveError.message || "Your expertise could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] px-8 pb-14 pt-8 max-md:px-4">
      <div className="mb-5">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-500">Mentor workspace / My Profile</p>
        <h1 className="m-0 text-2xl font-medium text-blue-950">My Profile</h1>
        <p className="mt-2 text-xs text-slate-500">Add your expertise so HR can use it in the mentor directory and matching workflows.</p>
      </div>
      {loading ? <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading your profile…</p> : (
        <form onSubmit={saveProfile} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-4 text-xs"><strong>Name</strong><p className="mb-0 mt-1 text-slate-600">{profile?.firstName} {profile?.lastName || ""}</p></div>
            <div className="rounded-lg bg-slate-50 p-4 text-xs"><strong>Email</strong><p className="mb-0 mt-1 text-slate-600">{profile?.email}</p></div>
          </div>
          <label className="block text-xs font-semibold text-slate-700">
            Your expertise
            <textarea
              value={expertise}
              onChange={(event) => setExpertise(event.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="For example: Java, SQL, React, Cloud Architecture"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-blue-500"
            />
            <span className="mt-1 block font-normal text-slate-500">Separate skills with commas. Maximum 2000 characters.</span>
          </label>
          {error && <p className="text-xs text-rose-700" role="alert">{error}</p>}
          {success && <p className="text-xs text-emerald-700" role="status">{success}</p>}
          <button type="submit" disabled={saving || loading} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">
            {saving ? "Saving…" : "Save profile"}
          </button>
        </form>
      )}
    </div>
  );
}
