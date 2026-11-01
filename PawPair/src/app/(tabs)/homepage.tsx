import { useState } from "react";
import PreHomepage from "../homepages/PreHomepage";
import PostHomepage from "../homepages/PostHomepage";

export default function Homepage() {
  const [homepageVersion, setHomepageVersion] = useState<"pre" | "post">("pre");

  if (homepageVersion === "post") {
    return <PostHomepage />;
  }

  return <PreHomepage />;
}
