import { useState } from "react";

function SalaryManagement() {
  const [items] = useState([
    { id: 1, role: "Worker", base: "₹15,000", bonus: "₹2,500" },
    { id: 2, role: "Supervisor", base: "₹30,000", bonus: "₹5,000" },
    { id: 3, role: "Admin", base: "₹50,000", bonus: "₹10,000" },
  ]);

  return (
    <div>
      <div className="page-header">
        <h1>Salary Management</h1>
        <p>View salary structures and edit payslip components for company roles.</p>
      </div>

      <div className="sp-card">
        <div className="sp-card-header">
          <h3>Salary Structures</h3>
        </div>
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Base Salary</th>
                <th>Bonus</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.role}</td>
                  <td>{item.base}</td>
                  <td>{item.bonus}</td>
                  <td className="actions">
                    <button className="sp-btn sp-btn-secondary sp-btn-sm">Edit</button>
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

export default SalaryManagement;
