"use client";

import useSideBar from "@/context/use-sidebar";
import { cn } from "@/lib/utils";
import React from "react";
import MaxMenu from "./maximized-menu";
import MinMenu from "./minimized-menu";

type Props = {
  company:
  | {
    id: string;
    name: string;
    icon: string;
  }
  | null
  | undefined;
};

const SideBar = ({ company }: Props) => {
  const { expand, onExpand, page, onSignOut } = useSideBar();
  return (
    <div
      className={cn(
        "bg-cream h-full w-[60px] fill-mode-forwards fixed md:relative",
        expand == undefined && "",
        expand == true
          ? "animate-open-sidebar"
          : expand == false && "animate-close-sidebar"
      )}
    >
      {
        expand ? (
          <MaxMenu
            company={company}
            current={page!}
            onExpand={onExpand}
            onSignOut={onSignOut}
          />
        ) : (
          <MinMenu
            company={company}
            onShrink={onExpand}
            current={page!}
            onSignOut={onSignOut}
          />
        )
      }

    </div>
  );
};

export default SideBar;
