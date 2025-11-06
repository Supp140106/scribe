import { createContext, useContext, useState } from "react";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [players, setplayers] = useState([]);

  return (
    <UserContext.Provider value={{ user, setUser, players, setplayers }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
