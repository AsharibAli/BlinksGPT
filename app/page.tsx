import React from "react";
import UnlockBlinks from "@/components/UnlockBlink";
import { Metadata } from "next";

export const metadata: Metadata = {
  other: {
    "dscvr:canvas:version": "vNext",
    "og:image": "/next.svg",
  },
};

const page = () => {
  return (
    <div>
      <UnlockBlinks />
    </div>
  );
};

export default page;