import { useState } from "react";

function UserManagement() {
  const [users] = useState([
    { id: 1, name: "Alice", role: "worker", status: "Active" },
    { id: 2, name: "Bob", role: "manager", status: "Active" },
    { id: 3, name: "Claire", role: "admin", status: "Active" },
  ]);

  return (
    <div>
      <div className="page-header">
        <h1>User Management</h1>
        <p>Manage users, roles, and active status within the company.</p>
      </div>

      <div className="sp-card">
        <div className="sp-card-header">
          <h3>Team Members</h3>
        </div>
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.role}</td>
                  <td>{user.status}</td>
                  <td className="actions">
                    <button className="sp-btn sp-btn-secondary sp-btn-sm">Edit</button>
                    <button className="sp-btn sp-btn-danger sp-btn-sm">Deactivate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default UserManagement;
