import { useEffect } from "react";

function Signout() {
  useEffect(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    localStorage.removeItem("company");
    localStorage.removeItem("companyName");
    window.location.href = "/login";
  }, []);

  return <div>Signing out...</div>;
}

export default Signout;

