export default function ProtectedRoute({ children }) {
  // TODO(A1): verify the session, redirect guests to /login, and enforce the role.
  return children;
}
