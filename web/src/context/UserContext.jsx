import { createContext, useContext, useState } from "react";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [players, setplayers] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null); // { id, name }

  return (
    <UserContext.Provider value={{ user, setUser, players, setplayers, selectedRecipient, setSelectedRecipient }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
