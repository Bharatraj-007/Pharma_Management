import { useEffect, useState, useCallback } from "react";
import API_BASE_URL from "../config";

const COMPANY_NAMES = {
  bharath: "Bharath Enterprises",
  shree_ganaapathy: "Shree Ganaapathy Roto Prints",
  vel: "Vel Gravure"
};

function Profile() {
  const token = localStorage.getItem("token");
  const userRole = (localStorage.getItem("role") || "worker").toLowerCase();
  const isAdminOrCeo = ["admin", "ceo"].includes(userRole);

  const [activeTab, setActiveTab] = useState("profile"); // profile | personal | employment | settings
  const [activeSettingsSection, setActiveSettingsSection] = useState("account"); // account | notifications | security | preferences | admin

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit Forms
  const [profileForm, setProfileForm] = useState({});
  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [companyForm, setCompanyForm] = useState({
    companyName: "",
    companyAddress: "",
    workingDays: [],
    holidays: "",
    shiftTiming: "09:00:00"
  });

  const [holidaysList, setHolidaysList] = useState([]);
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayReason, setHolidayReason] = useState("");

  const headers = {
    "Content-Type": "application/json",
    Authorization: token
  };

  const fetchHolidays = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/holidays`, {
        headers: { Authorization: token }
      });
      if (res.ok) {
        const data = await res.json();
        setHolidaysList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch holidays:", err);
    }
  }, [token]);

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/profile`, {
        headers: { Authorization: token }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        
        // Populate editable forms
        setProfileForm({
          name: data.name || "",
          dob: data.dob || "",
          gender: data.gender || "",
          bloodGroup: data.bloodGroup || "",
          address: data.address || "",
          permanentAddress: data.permanentAddress || "",
          emergencyContactName: data.emergencyContactName || "",
          emergencyContactNumber: data.emergencyContactNumber || "",
          emergencyContact: data.emergencyContact || "",
          idProofType: data.idProofType || "Aadhar",
          idProofNumber: data.idProofNumber || "",
          email: data.email || "",
          phone: data.phone || "",
          employeeNo: data.employeeNo || "",
          joiningDate: data.joiningDate || "",
          department: data.department || "",
          role: data.role || "",
          reportingManager: data.reportingManager || "",
          employmentType: data.employmentType || "Full-time",
          twoFactorEnabled: !!data.twoFactorEnabled,
          pushNotifications: data.pushNotifications !== false,
          attendanceReminders: data.attendanceReminders !== false,
          taskAlerts: data.taskAlerts !== false,
          language: data.language || "en",
          timezone: data.timezone || "UTC",
          idProofUrl: data.idProofUrl || ""
        });

        setCompanyForm({
          companyName: data.companyName || "",
          companyAddress: data.companyAddress || "",
          workingDays: Array.isArray(data.workingDays) ? data.workingDays : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
          holidays: Array.isArray(data.holidays) ? data.holidays.join(", ") : "",
          shiftTiming: data.shiftTiming || "09:00:00"
        });
      }
    } catch (err) {
      setError("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
    fetchHolidays();
  }, [fetchProfile, fetchHolidays]);

  // Save editable profile fields
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_BASE_URL}/profile`, {
        method: "PUT",
        headers,
        body: JSON.stringify(profileForm)
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.user);
        setEditing(false);
        setSuccess(data.message || "Profile updated!");
        fetchProfile();
      } else {
        throw new Error(data.error || "Failed to update profile");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/change-password`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Password updated successfully!");
        setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        throw new Error(data.error || "Failed to change password");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Save Company Settings
  const handleSaveCompanySettings = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const holidaysArray = companyForm.holidays
        ? companyForm.holidays.split(",").map(d => d.trim())
        : [];
        
      const res = await fetch(`${API_BASE_URL}/api/company/settings`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          companyName: companyForm.companyName,
          companyAddress: companyForm.companyAddress,
          workingDays: companyForm.workingDays,
          holidays: holidaysArray,
          shiftTiming: companyForm.shiftTiming
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Company settings updated!");
        fetchProfile();
      } else {
        throw new Error(data.error || "Failed to update company settings");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Add a holiday
  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!holidayDate || !holidayReason) return alert("Select a date and enter a reason");
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_BASE_URL}/holidays`, {
        method: "POST",
        headers,
        body: JSON.stringify({ date: holidayDate, reason: holidayReason })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Holiday added successfully!");
        setHolidayDate("");
        setHolidayReason("");
        fetchHolidays();
      } else {
        throw new Error(data.error || "Failed to add holiday");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Delete a holiday
  const handleDeleteHoliday = async (id) => {
    if (!window.confirm("Are you sure you want to delete this holiday?")) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_BASE_URL}/holidays/${id}`, {
        method: "DELETE",
        headers
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Holiday deleted successfully!");
        fetchHolidays();
      } else {
        throw new Error(data.error || "Failed to delete holiday");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle ID Upload
  const handleIdUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError("");
    setSuccess("");
    const formData = new FormData();
    formData.append("idProof", file);

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE_URL}/profile/upload-id`, {
        method: "POST",
        headers: { Authorization: token },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("ID proof uploaded successfully!");
        fetchProfile();
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle Photo Upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError("");
    setSuccess("");
    const formData = new FormData();
    formData.append("image", file); // tasks-create endpoint upload compatibility

    try {
      setSaving(true);
      // We can use a temporary upload route or save local url base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result;
        const res = await fetch(`${API_BASE_URL}/profile`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ profilePhoto: base64String })
        });
        if (res.ok) {
          setSuccess("Profile photo updated!");
          fetchProfile();
        } else {
          throw new Error("Failed to save avatar.");
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Toggle Preferences
  const handlePreferenceToggle = async (key, val) => {
    try {
      const updatedForm = { ...profileForm, [key]: val };
      setProfileForm(updatedForm);

      // Save theme in local storage
      if (key === "theme") {
        localStorage.setItem("theme", val);
        document.documentElement.dataset.theme = val;
      }

      await fetch(`${API_BASE_URL}/profile`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ [key]: val })
      });
    } catch {}
  };

  const getRoleBadge = (r) => {
    switch (r) {
      case "ceo": return "sp-badge sp-badge-danger";
      case "admin": return "sp-badge sp-badge-primary";
      case "manager": return "sp-badge sp-badge-warning";
      default: return "sp-badge sp-badge-success";
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch { return dateStr; }
  };

  if (loading && !profile) {
    return <div className="p-5 text-muted animate-pulse">Loading combined profile and settings...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>👤 Profile & Settings</h1>
        <p>Manage personal details, accounts, and application preferences in one place.</p>
      </div>

      {error && <div className="sp-alert sp-alert-danger mb-4">{error}</div>}
      {success && <div className="sp-alert sp-alert-success mb-4">{success}</div>}

      {/* Main Tab Routing */}
      <div className="sp-tabs mb-5">
        <button className={`sp-tab${activeTab === "profile" ? " active" : ""}`} onClick={() => setActiveTab("profile")}>
          👤 Profile Info
        </button>
        <button className={`sp-tab${activeTab === "personal" ? " active" : ""}`} onClick={() => setActiveTab("personal")}>
          🔑 Personal Details
        </button>
        <button className={`sp-tab${activeTab === "employment" ? " active" : ""}`} onClick={() => setActiveTab("employment")}>
          🏢 Employment
        </button>
        <button className={`sp-tab${activeTab === "settings" ? " active" : ""}`} onClick={() => setActiveTab("settings")}>
          ⚙️ Settings
        </button>
      </div>

      {/* ── TAB 1: PROFILE INFO ── */}
      {activeTab === "profile" && profile && (
        <div className="sp-card animate-fade">
          <div className="flex items-center gap-5 mb-5" style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "var(--space-4)" }}>
            <div style={{ position: "relative", cursor: "pointer" }}>
              {profile.profilePhoto ? (
                <img
                  src={profile.profilePhoto}
                  alt={profile.name}
                  style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <div style={{
                  width: 96, height: 96, borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "2.5rem", color: "#fff", fontWeight: 800
                }}>
                  {profile.name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <label style={{
                position: "absolute", bottom: 0, right: 0, backgroundColor: "var(--color-primary)",
                color: "#fff", width: 28, height: 28, borderRadius: "50%", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: "0.8rem", cursor: "pointer"
              }}>
                📷
                <input type="file" onChange={handlePhotoUpload} accept="image/*" style={{ display: "none" }} />
              </label>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "var(--font-2xl)" }}>{profile.name}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className={getRoleBadge(profile.role)}>{profile.role?.toUpperCase()}</span>
                <span className="sp-badge sp-badge-neutral">{COMPANY_NAMES[profile.company] || profile.company}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <span className="text-xs text-muted">Full Name</span>
              <p className="font-bold text-base mt-1">{profile.name || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-muted">Employee ID</span>
              <p className="font-bold text-base mt-1" style={{ color: "var(--color-primary)" }}>{profile.employeeNo || "Not assigned"}</p>
            </div>
            <div>
              <span className="text-xs text-muted">Designation/Role</span>
              <p className="font-bold text-base mt-1">{profile.role?.toUpperCase() || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-muted">Department</span>
              <p className="font-bold text-base mt-1">{profile.department || "General"}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: PERSONAL DETAILS ── */}
      {activeTab === "personal" && profile && (
        <div className="sp-card animate-fade">
          <div className="flex justify-between items-center mb-4" style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "10px" }}>
            <h3>🔑 Personal Details</h3>
            <button className="sp-btn sp-btn-secondary sp-btn-sm" onClick={() => setEditing(!editing)}>
              {editing ? "Cancel" : "✏️ Edit Details"}
            </button>
          </div>

          {!editing ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <span className="text-xs text-muted">Email Address</span>
                <p className="font-bold text-base mt-1">{profile.email}</p>
              </div>
              <div>
                <span className="text-xs text-muted">Phone Number</span>
                <p className="font-bold text-base mt-1">{profile.phone || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted">Date of Birth</span>
                <p className="font-bold text-base mt-1">{profile.dob ? formatDate(profile.dob) : "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted">Age (Calculated)</span>
                <p className="font-bold text-base mt-1">{profile.age || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted">Gender</span>
                <p className="font-bold text-base mt-1">{profile.gender || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted">Blood Group</span>
                <p className="font-bold text-base mt-1">{profile.bloodGroup || "—"}</p>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <span className="text-xs text-muted">Current Address</span>
                <p className="font-bold text-base mt-1">{profile.address || "—"}</p>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <span className="text-xs text-muted">Permanent Address</span>
                <p className="font-bold text-base mt-1">{profile.permanentAddress || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted">Emergency Contact Person</span>
                <p className="font-bold text-base mt-1">{profile.emergencyContactName || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted">Emergency Contact Number</span>
                <p className="font-bold text-base mt-1">{profile.emergencyContactNumber || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted">ID Proof</span>
                <p className="font-bold text-base mt-1">
                  {profile.idProofType ? `${profile.idProofType} - ${profile.idProofNumber}` : "Not uploaded"}
                </p>
                {profile.idProofUrl && (
                  <a
                    href={`${API_BASE_URL}${profile.idProofUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="sp-btn sp-btn-secondary sp-btn-sm mt-2"
                    style={{ display: "inline-block" }}
                  >
                    📄 View ID Document
                  </a>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile}>
              <div className="sp-card-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
                {isAdminOrCeo && (
                  <div className="sp-form-group">
                    <label className="sp-label">Email (Admin Edit)</label>
                    <input
                      type="email"
                      className="sp-input"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    />
                  </div>
                )}
                {isAdminOrCeo && (
                  <div className="sp-form-group">
                    <label className="sp-label">Phone (Admin Edit)</label>
                    <input
                      type="text"
                      className="sp-input"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    />
                  </div>
                )}

                <div className="sp-form-group">
                  <label className="sp-label">Date of Birth</label>
                  <input
                    type="date"
                    className="sp-input"
                    value={profileForm.dob}
                    onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })}
                  />
                </div>

                <div className="sp-form-group">
                  <label className="sp-label">Gender</label>
                  <select
                    className="sp-select"
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="sp-form-group">
                  <label className="sp-label">Blood Group</label>
                  <input
                    type="text"
                    className="sp-input"
                    placeholder="e.g. O+ve"
                    value={profileForm.bloodGroup}
                    onChange={(e) => setProfileForm({ ...profileForm, bloodGroup: e.target.value })}
                  />
                </div>

                <div className="sp-form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="sp-label">Current Address</label>
                  <input
                    type="text"
                    className="sp-input"
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  />
                </div>

                <div className="sp-form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="sp-label">
                    Permanent Address
                    <button
                      type="button"
                      className="sp-btn sp-btn-secondary sp-btn-sm ml-3"
                      style={{ padding: "2px 6px", fontSize: "0.75rem" }}
                      onClick={() => setProfileForm({ ...profileForm, permanentAddress: profileForm.address })}
                    >
                      Copy Current Address
                    </button>
                  </label>
                  <input
                    type="text"
                    className="sp-input"
                    value={profileForm.permanentAddress}
                    onChange={(e) => setProfileForm({ ...profileForm, permanentAddress: e.target.value })}
                  />
                </div>

                <div className="sp-form-group">
                  <label className="sp-label">Emergency Contact Name</label>
                  <input
                    type="text"
                    className="sp-input"
                    value={profileForm.emergencyContactName}
                    onChange={(e) => setProfileForm({ ...profileForm, emergencyContactName: e.target.value })}
                  />
                </div>

                <div className="sp-form-group">
                  <label className="sp-label">Emergency Contact Number</label>
                  <input
                    type="text"
                    className="sp-input"
                    value={profileForm.emergencyContactNumber}
                    onChange={(e) => setProfileForm({ ...profileForm, emergencyContactNumber: e.target.value })}
                  />
                </div>

                <div className="sp-form-group">
                  <label className="sp-label">ID Proof Type</label>
                  <select
                    className="sp-select"
                    value={profileForm.idProofType}
                    onChange={(e) => setProfileForm({ ...profileForm, idProofType: e.target.value })}
                  >
                    <option value="Aadhar">Aadhar</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving License">Driving License</option>
                  </select>
                </div>

                <div className="sp-form-group">
                  <label className="sp-label">ID Proof Number</label>
                  <input
                    type="text"
                    className="sp-input"
                    value={profileForm.idProofNumber}
                    onChange={(e) => setProfileForm({ ...profileForm, idProofNumber: e.target.value })}
                  />
                </div>

                <div className="sp-form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="sp-label">Upload ID Document (restricted access)</label>
                  <input type="file" className="sp-input" onChange={handleIdUpload} />
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button type="submit" className="sp-btn sp-btn-success" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button type="button" className="sp-btn sp-btn-secondary" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── TAB 3: EMPLOYMENT DETAILS ── */}
      {activeTab === "employment" && profile && (
        <div className="sp-card animate-fade">
          <h3>🏢 Employment Details</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "20px" }}>
            <div>
              <span className="text-xs text-muted">Date of Joining</span>
              <p className="font-bold text-base mt-1">{profile.joiningDate ? formatDate(profile.joiningDate) : "—"}</p>
            </div>
            <div>
              <span className="text-xs text-muted">Employment Type</span>
              <p className="font-bold text-base mt-1">{profile.employmentType || "Full-time"}</p>
            </div>
            <div>
              <span className="text-xs text-muted">Reporting Manager</span>
              <p className="font-bold text-base mt-1">{profile.reportingManager || "Not assigned"}</p>
            </div>
            <div>
              <span className="text-xs text-muted">Standard Shift Time</span>
              <p className="font-bold text-base mt-1">{profile.shiftTiming || "09:00 AM"}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: SETTINGS ── */}
      {activeTab === "settings" && profile && (
        <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: "24px" }} className="animate-fade">
          {/* Sub tab sidebar */}
          <div className="sp-card" style={{ padding: "16px", height: "fit-content" }}>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
              <li>
                <button
                  className={`sp-btn ${activeSettingsSection === "account" ? "sp-btn-primary" : "sp-btn-secondary"}`}
                  style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                  onClick={() => setActiveSettingsSection("account")}
                >
                  ⚙️ Account
                </button>
              </li>
              <li>
                <button
                  className={`sp-btn ${activeSettingsSection === "notifications" ? "sp-btn-primary" : "sp-btn-secondary"}`}
                  style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                  onClick={() => setActiveSettingsSection("notifications")}
                >
                  🔔 Notifications
                </button>
              </li>
              <li>
                <button
                  className={`sp-btn ${activeSettingsSection === "security" ? "sp-btn-primary" : "sp-btn-secondary"}`}
                  style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                  onClick={() => setActiveSettingsSection("security")}
                >
                  🛡️ Security Log
                </button>
              </li>
              <li>
                <button
                  className={`sp-btn ${activeSettingsSection === "preferences" ? "sp-btn-primary" : "sp-btn-secondary"}`}
                  style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                  onClick={() => setActiveSettingsSection("preferences")}
                >
                  🎨 Preferences
                </button>
              </li>
              {isAdminOrCeo && (
                <li>
                  <button
                    className={`sp-btn ${activeSettingsSection === "admin" ? "sp-btn-primary" : "sp-btn-secondary"}`}
                    style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                    onClick={() => setActiveSettingsSection("admin")}
                  >
                    🛡️ Admin Settings
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Sub tab detail */}
          <div className="sp-card">
            {/* --- Account section --- */}
            {activeSettingsSection === "account" && (
              <div>
                <h3>⚙️ Account Settings</h3>
                <hr className="my-4" />

                {/* Change password */}
                <form onSubmit={handleChangePassword} style={{ maxWidth: "400px" }} className="mb-5">
                  <h4>Change Password</h4>
                  <div className="sp-form-group mt-3">
                    <label className="sp-label">Current Password</label>
                    <input
                      type="password"
                      className="sp-input"
                      value={passwordForm.oldPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div className="sp-form-group">
                    <label className="sp-label">New Password</label>
                    <input
                      type="password"
                      className="sp-input"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div className="sp-form-group">
                    <label className="sp-label">Confirm New Password</label>
                    <input
                      type="password"
                      className="sp-input"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                  <button type="submit" className="sp-btn sp-btn-primary" disabled={saving}>
                    Update Password
                  </button>
                </form>

                {/* Request Email/Phone update */}
                {!isAdminOrCeo && (
                  <div style={{ maxWidth: "400px", borderTop: "1px solid var(--color-border)", paddingTop: "20px" }}>
                    <h4>Request Contact Update</h4>
                    <p className="text-muted text-xs mb-3">Email and phone number updates require administrator review and approval before they take effect.</p>
                    <form onSubmit={handleSaveProfile}>
                      <div className="sp-form-group">
                        <label className="sp-label">New Email Address</label>
                        <input
                          type="email"
                          className="sp-input"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        />
                      </div>
                      <div className="sp-form-group">
                        <label className="sp-label">New Phone Number</label>
                        <input
                          type="text"
                          className="sp-input"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        />
                      </div>
                      <button type="submit" className="sp-btn sp-btn-warning">
                        Submit Request
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* --- Notifications section --- */}
            {activeSettingsSection === "notifications" && (
              <div>
                <h3>🔔 Notification Reminders</h3>
                <hr className="my-4" />

                <div className="sp-form-group flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={profileForm.pushNotifications}
                    onChange={(e) => handlePreferenceToggle("pushNotifications", e.target.checked)}
                  />
                  <label className="sp-label" style={{ marginBottom: 0 }}>Push Notifications</label>
                </div>
                <div className="sp-form-group flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={profileForm.attendanceReminders}
                    onChange={(e) => handlePreferenceToggle("attendanceReminders", e.target.checked)}
                  />
                  <label className="sp-label" style={{ marginBottom: 0 }}>Attendance Reminders</label>
                </div>
                <div className="sp-form-group flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={profileForm.taskAlerts}
                    onChange={(e) => handlePreferenceToggle("taskAlerts", e.target.checked)}
                  />
                  <label className="sp-label" style={{ marginBottom: 0 }}>Task Assignment Alerts</label>
                </div>
              </div>
            )}

            {/* --- Security section --- */}
            {activeSettingsSection === "security" && (
              <div>
                <h3>🛡️ Security Logs</h3>
                <hr className="my-4" />

                <h4>Recent Login Activity</h4>
                <div className="sp-table-wrap mt-3">
                  <table className="sp-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>IP Address</th>
                        <th>Device/Agent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.loginActivity && profile.loginActivity.length > 0 ? (
                        profile.loginActivity.map((log, idx) => (
                          <tr key={idx}>
                            <td>{new Date(log.timestamp).toLocaleString("en-IN")}</td>
                            <td>{log.ip || "Unknown"}</td>
                            <td style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>{log.device || "Browser Session"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="empty-cell">No recent login records.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5" style={{ borderTop: "1px solid var(--color-border)", paddingTop: "20px" }}>
                  <h4>Active Sessions</h4>
                  <p className="text-muted text-xs mt-1">If you suspect unauthorized access, click below to end all other active browser/app sessions.</p>
                  <button
                    className="sp-btn sp-btn-danger mt-3"
                    onClick={() => {
                      alert("Successfully requested session logouts.");
                    }}
                  >
                    🚫 Log Out From Other Devices
                  </button>
                </div>
              </div>
            )}

            {/* --- Preferences section --- */}
            {activeSettingsSection === "preferences" && (
              <div>
                <h3>🎨 App Preferences</h3>
                <hr className="my-4" />

                <div className="sp-form-group">
                  <label className="sp-label">Application Theme</label>
                  <div className="flex gap-3 mt-2">
                    <button
                      className={`sp-btn ${profileForm.theme === "light" || !profileForm.theme ? "sp-btn-primary" : "sp-btn-secondary"}`}
                      onClick={() => handlePreferenceToggle("theme", "light")}
                    >
                      ☀ Light Mode
                    </button>
                    <button
                      className={`sp-btn ${profileForm.theme === "dark" ? "sp-btn-primary" : "sp-btn-secondary"}`}
                      onClick={() => handlePreferenceToggle("theme", "dark")}
                    >
                      🌙 Dark Mode
                    </button>
                  </div>
                </div>

                <div className="sp-form-group mt-4">
                  <label className="sp-label">Language</label>
                  <select
                    className="sp-select"
                    value={profileForm.language}
                    onChange={(e) => handlePreferenceToggle("language", e.target.value)}
                  >
                    <option value="en">English (US)</option>
                    <option value="en-IN">English (India)</option>
                    <option value="ta">Tamil</option>
                    <option value="hi">Hindi</option>
                  </select>
                </div>

                <div className="sp-form-group">
                  <label className="sp-label">Time Zone</label>
                  <select
                    className="sp-select"
                    value={profileForm.timezone}
                    onChange={(e) => handlePreferenceToggle("timezone", e.target.value)}
                  >
                    <option value="UTC">UTC / Greenwich Mean Time</option>
                    <option value="Asia/Kolkata">IST - Indian Standard Time (GMT+5:30)</option>
                  </select>
                </div>
              </div>
            )}

            {/* --- Admin section --- */}
            {activeSettingsSection === "admin" && isAdminOrCeo && (
              <form onSubmit={handleSaveCompanySettings}>
                <h3>🛡️ Admin & CEO Configurations</h3>
                <hr className="my-4" />

                <div className="sp-card-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="sp-form-group">
                    <label className="sp-label">Company Name</label>
                    <input
                      type="text"
                      className="sp-input"
                      value={companyForm.companyName}
                      onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                    />
                  </div>

                  <div className="sp-form-group">
                    <label className="sp-label">Shift Start Time (HH:MM:SS)</label>
                    <input
                      type="text"
                      className="sp-input"
                      placeholder="e.g. 09:00:00"
                      value={companyForm.shiftTiming}
                      onChange={(e) => setCompanyForm({ ...companyForm, shiftTiming: e.target.value })}
                    />
                  </div>
                </div>

                <div className="sp-form-group mt-3">
                  <label className="sp-label">Company Address</label>
                  <input
                    type="text"
                    className="sp-input"
                    value={companyForm.companyAddress}
                    onChange={(e) => setCompanyForm({ ...companyForm, companyAddress: e.target.value })}
                  />
                </div>

                <div className="sp-form-group mt-3">
                  <label className="sp-label">Working Days</label>
                  <div className="flex gap-4 flex-wrap mt-2">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => {
                      const checked = companyForm.workingDays.includes(day);
                      return (
                        <label key={day} className="flex items-center gap-2 text-sm" style={{ cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...companyForm.workingDays, day]
                                : companyForm.workingDays.filter(d => d !== day);
                              setCompanyForm({ ...companyForm, workingDays: next });
                            }}
                          />
                          {day}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="sp-card mt-5" style={{ background: "var(--color-surface-alt)", padding: "20px", borderRadius: "8px", border: "1px dashed var(--color-border)" }}>
                  <h4 style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 0 8px 0" }}>🗓️ Holiday Management</h4>
                  <p className="text-muted text-xs mb-4">Add, view, and remove company holiday dates in advance. These will automatically be marked as Paid Leave for all staff.</p>
                  
                  {/* Add holiday form */}
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap", marginBottom: "20px" }}>
                    <div className="sp-form-group" style={{ margin: 0, flex: "1 1 180px" }}>
                      <label className="sp-label">Select Date</label>
                      <input
                        type="date"
                        className="sp-input"
                        value={holidayDate}
                        onChange={(e) => setHolidayDate(e.target.value)}
                      />
                    </div>
                    <div className="sp-form-group" style={{ margin: 0, flex: "2 1 250px" }}>
                      <label className="sp-label">Holiday Name / Occasion</label>
                      <input
                        type="text"
                        className="sp-input"
                        placeholder="e.g. Independence Day, Diwali"
                        value={holidayReason}
                        onChange={(e) => setHolidayReason(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="sp-btn sp-btn-primary"
                      onClick={handleAddHoliday}
                      style={{ padding: "0 16px", height: "42px", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <span>➕</span> Add Holiday
                    </button>
                  </div>

                  {/* Holiday list */}
                  <div className="sp-table-wrap" style={{ maxHeight: "250px", overflowY: "auto" }}>
                    <table className="sp-table" style={{ background: "var(--color-surface)", borderRadius: "4px" }}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Occasion</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {holidaysList.length === 0 ? (
                          <tr>
                            <td colSpan="3" className="empty-cell" style={{ padding: "12px", textAlign: "center", color: "var(--color-text-muted)" }}>
                              No holidays pre-configured.
                            </td>
                          </tr>
                        ) : (
                          holidaysList.map((h) => (
                            <tr key={h._id}>
                              <td><strong>{h.date}</strong></td>
                              <td><span className="sp-badge sp-badge-neutral">{h.reason}</span></td>
                              <td>
                                <button
                                  type="button"
                                  className="sp-btn sp-btn-danger sp-btn-sm"
                                  onClick={() => handleDeleteHoliday(h._id)}
                                  style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                                >
                                  🗑️ Remove
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px" }} className="mt-4">
                  <button type="submit" className="sp-btn sp-btn-success" disabled={saving}>
                    Save Company Configurations
                  </button>
                </div>

                <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
                  <h4>Quick Links</h4>
                  <div className="flex gap-3 mt-3">
                    <a href="/user-management" className="sp-btn sp-btn-secondary">👥 Add/Edit Staff ↗</a>
                    <a href="/audit-logs" className="sp-btn sp-btn-secondary">📋 View System Audit Logs ↗</a>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
