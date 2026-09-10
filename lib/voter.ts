export function getVoterId(): string {
  // 1. Check if we are running in the browser. 
  // If we are on the server, return an empty string (or handle gracefully).
  if (typeof window === "undefined") {
    return "";
  }

  let id = localStorage.getItem("voter_id");
  
  if (!id) {
    // 2. Safe to use crypto and localStorage now that we're strictly client-side
    id = window.crypto.randomUUID();
    localStorage.setItem("voter_id", id);
  }
  
  return id;
}