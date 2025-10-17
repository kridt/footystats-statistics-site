import { create } from "zustand";
import { loadStarred, saveStarred } from "../utils/storage";

export const useStarredLeagues = create((set, get) => ({
  starred: loadStarred(),
  toggle: (id) => {
    const cur = get().starred;
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
    saveStarred(next);
    set({ starred: next });
  },
  isStarred: (id) => get().starred.includes(id)
}));
