import { useEffect } from "react";

const usePageTitle = (title) => {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} | Noosphere` : "Noosphere";
    return () => { document.title = prev; };
  }, [title]);
};

export default usePageTitle;
