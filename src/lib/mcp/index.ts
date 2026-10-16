import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchPosts from "./tools/search-posts";
import getPost from "./tools/get-post";
import listMyPosts from "./tools/list-my-posts";
import listBookmarks from "./tools/list-bookmarks";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "rosellea",
  title: "Rosellea",
  version: "0.1.0",
  instructions:
    "Tools for Rosellea, a multilingual reading and publishing platform. Search and read published articles and books, and see your own posts and bookmarks.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchPosts, getPost, listMyPosts, listBookmarks],
});
