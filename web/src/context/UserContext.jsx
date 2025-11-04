import { createContext, useContext, useState } from "react";

const UserContext = createContext(null);


export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [friends, setFriends] = useState([]);




  return (
    <UserContext.Provider
      value={{ user, setUser, friends, setFriends }}
    >
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
